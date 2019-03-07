import {ConditionsRegistry} from './conditions.registry';
import {
  AllocationDefinition,
  AllocationOutput, CompositeDef,
  ConditionDef,
  DataSet,
  MultiDef,
  SingleDef
} from './defs';

/**
 * The class can apply Allocation definitions to data sets,
 * effectively allocating each data row to its place in the allocation output tree.
 *
 * Topologically, the allocation definition and the allocation output should be the same,
 * with the slight exception of MultiDef conditions, which do get expanded upon conversion
 * to allocation output.
 */

type MultiNamingFunction = (name: string, values: any[], index: number) => string;
type SingleNamingFunction = (name: string, value: any) => string;
type PositionObjVerifier = (position: any, property: string, value: any) => boolean;
type GenericFilterFunction = (position: any) => boolean;


type MultiAllocProcessor = (multiDef: MultiDef, json: AllocationDefinition, positions: any[]) => AllocationOutput;
type SingleAllocProcessor = (singleDef: SingleDef, json: AllocationDefinition, positions: any[]) => AllocationOutput;
type CompositeAllocProcessor = (compositeDef: CompositeDef, json: AllocationDefinition, positions: any[]) => AllocationOutput;

export class AllocationExecutor {
  constructor(private registry: ConditionsRegistry) {}

  private verifiers = {
    single: {
      between: function (position, property, conditionValue) {
        const propertyValue = position[property];
        const leftBoundary = conditionValue.range[0];
        const rightBoundary = conditionValue.range[1];

        if (propertyValue < leftBoundary || propertyValue > rightBoundary) {
          return false;
        }
        return !((!conditionValue.included[0] && propertyValue === leftBoundary)
          || (!conditionValue.included[1] && propertyValue === rightBoundary));
      },
      identity: function (position, property, conditionValue) {
        return position[property] === conditionValue;
      },
      comparison: function (posObj, property, value) {
        switch (value.operator) {
          case '<':
            return posObj[property] < value.value;
          case '<=':
            return posObj[property] <= value.value;
          case '=':
            return posObj[property] === value.value;
          case '>=':
            return posObj[property] >= value.value;
          case '>':
            return posObj[property] > value.value;
        }
      }
    }
  };
  private allocSingle = {
    between: this.makeAllocSingle(
      this.verifiers.single.between,
      function name(property, value) {
        const firstSign = value.included[0] ? ' < ' : ' <= ';
        const secondSign = value.included[1] ? ' < ' : ' <= ';
        return value.range[0] + firstSign + property + secondSign + value.range[1];
      }
    ),
    identity: this.makeAllocSingle(
      this.verifiers.single.identity,
      function name(property, value) {
        return property + ' is ' + value;
      }
    ),
    comparison: this.makeAllocSingle(
      this.verifiers.single.comparison,
      function name(property, value) {
        return property + ' ' + value.operator + ' ' + value.value;
      }
    )
  };

  private allocMulti = {
    values: this.makeAllocMulti(
      function verify(posObj, property, value) {
        return posObj[property] === value;
      },
      function name(property, values, index) {
        return property + ' = ' + values[index];
      }
    ),
    enums: this.makeAllocMulti(
      function (posObj, property, value) {
        return value.indexOf(posObj[property]) !== -1;
      },
      function name(property, values, index) {
        return property + ' IN ' + values[index].join(', ');
      }
    ),
    ranges: this.makeAllocMulti(
      function (posObj, property, value) {
        // NOTE! This relies on ranges values being sorted
        // ascendingly with a MAX_NUM pushed at the end.
        // TODO: Guarantee it is so!
        return posObj[property] < value;
      },
      function name(property, values, index) {
        if (index === 0) {
          return property + ' < ' + values[index];
        } else if (index !== values.length - 1) {
          return property + ' BETWEEN ' + values[index - 1] + ' AND ' + values[index];
        } else {
          return property + ' > ' + values[index - 1];
        }
      }
    )
  };

  private allocComposite = this.makeAllocComposite((def) => this.compositeToMatcher(def));

  private static makeAllocFolder(name: string, classified, unclassified, children): AllocationOutput {
    return {
      folderName: name,
      classified: classified,
      unclassified: unclassified,
      children: children
    };
  }

  private filterPositions(positions: any[], filterFunction: GenericFilterFunction) {
    const classified = [];
    const unclassified = [];

    positions.forEach(function (posObj) {
      if (filterFunction(posObj)) {
        classified.push(posObj);
      } else {
        unclassified.push(posObj);
      }
    });

    return {
      classified: classified,
      unclassified: unclassified
    };
  }

  private singleToMatcher(singleDef: SingleDef) {
    const verifier = this.verifiers.single[singleDef.type];
    return function(posObj) {
      return verifier(posObj, singleDef.property, singleDef.value);
    };
  }

  /**
   * Transform to logical tree with function leafs
   */
  private toLogicalTree(conditionDef: ConditionDef) {
    switch (conditionDef.type) {
      case 'between':
      case 'comparison':
      case 'identity':
        return this.singleToMatcher(conditionDef); // Leaf function
      case 'not':
      case 'bool': // TODO: Test bool (KNOWN BUG)
        return {
          type: conditionDef.type,
          value: this.toLogicalTree(this.registry.fetch(conditionDef.value))
        };
      case 'and':
      case 'or':
        const values = conditionDef.values
          .map((val) => this.registry.fetch(val))
          .map((val) => this.toLogicalTree(val));
        return {
          type: conditionDef.type,
          values: values
        };
      default:
        return null;
    }
  }
  private applyLogicalTree(posObj, logicalTree) {
    if (!logicalTree.type) {
      return logicalTree(posObj);
    }
    switch (logicalTree.type) {
      case 'and':
        for (let i = 0; i < logicalTree.values.length; i++) {
          if (!this.applyLogicalTree(posObj, logicalTree.values[i])) {
            return false; // Skipping evaluation of remaining and branches
          }
        }
        return true;
      case 'or':
        for (let i = 0; i < logicalTree.values.length; i++) {
          if (this.applyLogicalTree(posObj, logicalTree.values[i])) {
            return true; // Skipping evaluation of remaining or branches
          }
        }
        return false;
      case 'not':
        return !this.applyLogicalTree(posObj, logicalTree.value);
      default:
    }
  }
  /** A function that given a composite def returns a matched
   * A suggested strategy is to evaluate logic branches on a need per basis
   */
  private compositeToMatcher(compositeDef: CompositeDef) {
    const that = this;
    const logicalTree = that.toLogicalTree(compositeDef);
    return function (positionObj: any) {
      return that.applyLogicalTree(positionObj, logicalTree);
    };
  }

  private makeAllocSingle(posObjVerifier: PositionObjVerifier, namingFunction: SingleNamingFunction): SingleAllocProcessor {
    const that = this;
    return function (singleDef: SingleDef, json: AllocationDefinition, positions: any[]): AllocationOutput {
      const property = singleDef.property;
      const value = singleDef.value;

      const filtered = that.filterPositions(positions, function (posObj) {
        return posObjVerifier(posObj, property, value);
      });

      let classified = filtered.classified;

      const name = namingFunction(property, value);
      let kids = [];
      if (classified.length > 0) {
        const kidsWrapper = that.interpretDefJson(json.children, classified);
        if (kidsWrapper != null) {
          // The unclassified among children remain as classified at current level
          classified = kidsWrapper.unclassified;
          kidsWrapper.unclassified = [];
          kids = kidsWrapper.children;
        }
      }
      return AllocationExecutor.makeAllocFolder(name, classified, filtered.unclassified, kids);
    };
  }


  private makeAllocMulti(posObjVerifier: PositionObjVerifier, namingFunction: MultiNamingFunction): MultiAllocProcessor {
    const that = this;
    return function (multiDef: MultiDef, json: AllocationDefinition, positions: any[]): AllocationOutput {
      const property = multiDef.property;
      const values = multiDef.values.slice(0);

      if (multiDef.type === 'ranges') {
        values.push(Number.MAX_VALUE);
      }

      const allocFolders = [];
      let positionsLeft = positions;

      values.forEach(function (value, index) {
        const filtered = that.filterPositions(positionsLeft, function (posObj) {
          return posObjVerifier(posObj, property, value);
        });
        positionsLeft = filtered.unclassified;

        const classified = filtered.classified;
        if (classified.length === 0) {
          return;
        }

        const kids = that.interpretDefJson(json.children, classified);
        const name = property;
        if (kids != null) {
          kids.folderName = namingFunction(name, values, index);
          kids.classified = kids.unclassified;
          kids.unclassified = [];
          allocFolders.push(kids);
          // NOTE: The unclassified of kids here is part of the classified
          // under the current groupAlloc member, therefore they do not
          // move over to the next groupAlloc member
        } else {
          allocFolders.push(AllocationExecutor.makeAllocFolder(namingFunction(name, values, index), classified, [], []));
        }
      });

      return AllocationExecutor.makeAllocFolder('Wrapper', [], positionsLeft, allocFolders);
    };
  }

  private makeAllocComposite(matcherMaker: (value: CompositeDef) => GenericFilterFunction): CompositeAllocProcessor {
    const that = this;
    return function (compositeDef: CompositeDef, json: AllocationDefinition, positions: any[]): AllocationOutput {
      const name = compositeDef.name;
      const matcher = matcherMaker(compositeDef);
      const filtered = that.filterPositions(positions, matcher);

      let classified = filtered.classified;

      let kids = [];
      if (classified.length > 0) {
        const kidsWrapper = that.interpretDefJson(json.children, classified);
        if (kidsWrapper != null) {
          // The unclassified among children remain as classified at current level
          classified = kidsWrapper.unclassified;
          kidsWrapper.unclassified = [];
          kids = kidsWrapper.children;
        }
      }
      return AllocationExecutor.makeAllocFolder(name, classified, filtered.unclassified, kids);
    };
  }
  /**
   * Takes alloc definition and list of positions and returns allocated data
   * TODO: @return {AllocFolder} allocatedData
   */
  private interpretDefJson (json: AllocationDefinition | AllocationDefinition[], positions): AllocationOutput {
    if (json instanceof Array) {
      let allocIndex = 0;
      const children = [];
      let _endedUpUnclassified = [];
      let toBeClassified = positions;
      while (allocIndex < json.length) {
        const tempChild = this.interpretDefJson(json[allocIndex], toBeClassified);

        if (tempChild.folderName === 'Wrapper') {
          tempChild.children.forEach(function (val) {
            children.push(val);
          });
        } else {
          children.push(tempChild);
        }

        toBeClassified = tempChild.unclassified;
        tempChild.unclassified = [];

        if (toBeClassified.length === 0) {
          break; // All has been classified, no need to go through remaining allocs
        } else if (allocIndex === json.length - 1) {
          _endedUpUnclassified = toBeClassified;
        }
        allocIndex++;
      }

      if (children.length === 0) {
        return null; // MUST RETURN NULL if no children
      }
      return AllocationExecutor.makeAllocFolder('Wrapper', [], _endedUpUnclassified, children);
    } else {
      if (json.id === 'root') {
        return this.interpretDefJson(json.children, positions);
      }
      const def: ConditionDef = this.registry.fetch(json.id);
      switch (def.type) {
        case 'values':
          return this.allocMulti.values(def, json, positions);
        case 'ranges':
          return this.allocMulti.ranges(def, json, positions);
        case 'enums':
          return this.allocMulti.enums(def, json, positions);

        case 'between':
          return this.allocSingle.between(def, json, positions);
        case 'identity':
          return this.allocSingle.identity(def, json, positions);
        case 'comparison':
          return this.allocSingle.comparison(def, json, positions);

        case 'and':
        case 'or':
        case 'not':
          return this.allocComposite(def, json, positions);
      }
    }
  }

  interpret (allocationDef: AllocationDefinition, dataSet: DataSet): AllocationOutput {
    if (!allocationDef || allocationDef.id !== 'root') {
      return AllocationExecutor.makeAllocFolder('Error', [], [], []);
    }
    const result = this.interpretDefJson(allocationDef, dataSet.positions);
    if (!result) {
      return AllocationExecutor.makeAllocFolder('Wrapper', dataSet.positions, [], []);
    }
    const newClassified = result.unclassified.slice();
    result.unclassified = []; // TODO: Clean unclassified arrays in children once they're no longer needed
    if (result.folderName === 'Wrapper') {
      result.classified = newClassified;
      return result;
    } else {
      return AllocationExecutor.makeAllocFolder('Wrapper', newClassified, [], [result]);
    }
  }

}
