import {ConditionsRegistry} from './conditions.registry';
import {AllocationDefinition, DataSet} from './defs';
import {catchError} from 'rxjs/operators';

/**
 * The class can apply Allocation definitions to data sets,
 * effectively allocating each data row to its place in the allocation output tree.
 *
 * Topologically, the allocation definition and the allocation output should be the same,
 * with the slight exception of MultiDef conditions, which do get expanded upon conversion
 * to allocation output.
 */
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

  private static makeAllocFolder(name: string, classified, unclassified, children) {
    return {
      name: name,
      _classified: classified,
      _unclassified: unclassified,
      children: children
    };
  }

  private filterPositions(positions, filterFunction) {
    const _classified = [];
    const _unclassified = [];

    positions.forEach(function (posObj) {
      if (filterFunction(posObj)) {
        _classified.push(posObj);
      } else {
        _unclassified.push(posObj);
      }
    });

    return {
      _classified: _classified,
      _unclassified: _unclassified
    };
  }

  private singleToMatcher(singleDef) {
    const verifier = this.verifiers.single[singleDef.type];
    return function(posObj) {
      return verifier(posObj, singleDef.property, singleDef.value);
    };
  }

  /**
   * Transform to logical tree with function leafs
   */
  private toLogicalTree(def) {
    if (def.property) {
      return this.singleToMatcher(def); // Leaf function
    }
    return {
      type: def.type,
      values: def.values ?
        def.values
          .map((val) => this.registry.fetch(val))
          .map((val) => this.toLogicalTree(val))
        : undefined,
      value: def.value ?
        this.toLogicalTree(this.registry.fetch(def.value))
        : undefined
    };
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
  private compositeToMatcher(compositeDef) {
    const that = this;
    const logicalTree = that.toLogicalTree(compositeDef);
    return function (posObj) {
      return that.applyLogicalTree(posObj, logicalTree);
    };
  }

  private makeAllocSingle(posObjVerifier, namingFunction) {
    const that = this;
    return function (singleDef, json, positions) {
      const property = singleDef.property;
      const alias = singleDef.alias;
      const value = singleDef.value;

      const filtered = that.filterPositions(positions, function (posObj) {
        return posObjVerifier(posObj, property, value);
      });

      let classified = filtered._classified;

      const name = namingFunction(alias || property, value); // TODO: Used to be alias
      let kids = [];
      if (classified.length > 0) {
        const kidsWrapper = that.interpretDefJson(json.children, classified);
        if (kidsWrapper != null) {
          // The unclassified among children remain as classified at current level
          classified = kidsWrapper._unclassified;
          kidsWrapper._unclassified = [];
          kids = kidsWrapper.children;
        }
      }
      return AllocationExecutor.makeAllocFolder(name, classified, filtered._unclassified, kids);
    };
  }

  private makeAllocMulti(posObjVerifier, namingFunction) {
    const that = this;
    return function (multiDef, json, positions) {
      const property = multiDef.property;
      const alias = multiDef.alias;
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
        positionsLeft = filtered._unclassified;

        const classified = filtered._classified;
        if (classified.length === 0) {
          return;
        }

        const kids = that.interpretDefJson(json.children, classified);
        const name = alias || property;
        if (kids != null) {
          kids.name = namingFunction(name, values, index);
          kids._classified = kids._unclassified;
          kids._unclassified = [];
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

  private makeAllocComposite(matcherMaker: (value: any) => (value: any) => boolean) {
    const that = this;
    return function (compositeDef, json, positions) {
      const alias = compositeDef.alias || compositeDef.name;
      const matcher = matcherMaker(compositeDef);
      const filtered = that.filterPositions(positions, matcher);

      let classified = filtered._classified;

      const name = alias;
      let kids = [];
      if (classified.length > 0) {
        const kidsWrapper = that.interpretDefJson(json.children, classified);
        if (kidsWrapper != null) {
          // The unclassified among children remain as classified at current level
          classified = kidsWrapper._unclassified;
          kidsWrapper._unclassified = [];
          kids = kidsWrapper.children;
        }
      }
      return AllocationExecutor.makeAllocFolder(name, classified, filtered._unclassified, kids);
    };
  }
  /**
   * Takes alloc definition and list of positions and returns allocated data
   * TODO: @return {AllocFolder} allocatedData
   */
  private interpretDefJson (json, positions) {
    if (json.constructor === Array) {
      let allocIndex = 0;
      const children = [];
      let _endedUpUnclassified = [];
      let toBeClassified = positions;
      while (allocIndex < json.length) {
        const tempChild = this.interpretDefJson(json[allocIndex], toBeClassified);

        if (tempChild.name === 'Wrapper') {
          tempChild.children.forEach(function (val) {
            children.push(val);
          });
        } else {
          children.push(tempChild);
        }

        toBeClassified = tempChild._unclassified;
        tempChild._unclassified = [];

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
      const def = this.registry.fetch(json.id);
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

  interpret (allocationDef: AllocationDefinition, dataSet: DataSet) {
    if (!allocationDef || allocationDef.id !== 'root') {
      console.error('allocation definition does not have a proper root id.');
      return AllocationExecutor.makeAllocFolder('Error', [], [], []);
    }
    const result = this.interpretDefJson(allocationDef, dataSet.positions);
    if (!result) {
      return AllocationExecutor.makeAllocFolder('Wrapper', dataSet.positions, [], []);
    }
    const newClassified = result._unclassified.slice();
    result._unclassified = []; // TODO: Clean unclassified arrays in children once they're no longer needed
    if (result.name === 'Wrapper') {
      result._classified = newClassified;
      return result;
    } else {
      return AllocationExecutor.makeAllocFolder('Wrapper', newClassified, [], [result]);
    }
  }

  async interpretAsync(allocationDef: AllocationDefinition, dataSet: DataSet) {
    return await this.interpret(allocationDef, dataSet);
  }
}
