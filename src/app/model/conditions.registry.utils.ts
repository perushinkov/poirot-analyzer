import {ConditionsRegistry} from './conditions.registry';
import {ConditionDef} from './defs';
import {Conditions, NamedCondition} from './named.condition';

export class ConditionsRegistryUtils {
  private static _getChildrenArray(registry: ConditionsRegistry, conditionId: string, followReferences: boolean, isRoot: boolean) {
    const flattenedChildren = [];
    const cd = registry.fetch(conditionId);
    if (!cd) {
      return [null];
    }
    if (!isRoot && !followReferences && cd.name && cd.name !== '') {
      return [cd];
    }

    // TODO: add referencing ability in Editors
    if (cd.type === 'and' || cd.type === 'or') {
      if (cd.values.length > 0) {
        cd.values.forEach(childId => {
          flattenedChildren.push(...this._getChildrenArray(registry, childId, followReferences, false));
        });
      } else {
        flattenedChildren.push(null);
      }
    } else if (cd.type === 'not') {
      flattenedChildren.push(...this._getChildrenArray(registry, cd.value, followReferences, false));
    }

    flattenedChildren.push(cd);
    return flattenedChildren;
  }
  /**
   * Returns a list of the condition nodes making up the given conditionId, including the condition referenced by it.
   * Node order is DFS-based (Depth-first search) to ensure children come before parents. This is useful when migrating a complex condition
   * from one registry to another, because you're guaranteed that in the children array each condition only depends on conditions before it.
   * (Except for condition-references, which are references to previously created named conditions).
   */
  static getChildrenArray(registry: ConditionsRegistry, conditionId: string, followReferences: boolean): ConditionDef[] {
    return this._getChildrenArray(registry, conditionId, followReferences, true);
  }

  // TODO: Should be tested before use, or removed entirely
  static containsWipNodes(registry: ConditionsRegistry, conditionId: string) {
    if (!conditionId) {
      return true;
    }
    return ConditionsRegistryUtils.getChildrenArray(registry, conditionId, false).includes(null);
  }

  static buildNamedConditions(registry: ConditionsRegistry): Conditions {
    const conditions: Conditions = {};
    const registryObj = registry.getShallowCopy();
    const listOfConditionDefs = Object.values(registryObj);

    listOfConditionDefs
      .filter(conditionDef => conditionDef.name && conditionDef.name !== '')
      .map(conditionDef => new NamedCondition(conditionDef.name, conditionDef.id))
      .forEach(def => {
        if (conditions[def.name]) {
          throw Error('Condition defs with the same names found!');
        }
        conditions[def.name] = def;
      });

    listOfConditionDefs.map(conditionDef => {
      const referencedIds = [];
      if (conditionDef.type === 'not') {
        referencedIds.push(conditionDef.value);
      }
      if (conditionDef.type === 'and' || conditionDef.type === 'or') {
        referencedIds.push(...conditionDef.values);
      }
      referencedIds.forEach(referencedId => {
        const referencedDef = registry.fetch(referencedId);
        // TODO: Add buildNamedConditions test that breaks if that last if clause is missing
        if (referencedDef.name && referencedDef.name !== '' && referencedId !== conditionDef.id) {
          conditions[referencedDef.name].addReference(conditionDef.id);
        }
      });
    });
    return conditions;
  }
}
