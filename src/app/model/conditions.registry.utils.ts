import {ConditionsRegistry} from './conditions.registry';
import {ConditionDef} from './defs';

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

  // TODO: TEST
  static containsWipNodes(registry: ConditionsRegistry, conditionId: string) {
    if (!conditionId) {
      return true;
    }
    return ConditionsRegistryUtils.getChildrenArray(registry, conditionId, false).includes(null);
  }

  // TODO: TEST
  getName(registry: ConditionsRegistry, id: string) {
    const def = registry.fetch(id);
    return def ? def.name : '';
  }
}
