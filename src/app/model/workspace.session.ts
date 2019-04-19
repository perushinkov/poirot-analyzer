import {ConditionsBuilder} from './conditions.builder';
import {Workspace} from './workspace';
import {ConditionsRegistryUtils} from './conditions.registry.utils';
import {NamedCondition} from './named.condition';

export class WorkspaceSession {
  static createForTest(workspace: Workspace, permanentBuilder: ConditionsBuilder, transientBuilder: ConditionsBuilder) {
    return new WorkspaceSession(workspace, permanentBuilder, transientBuilder);
  }

  static createFromWorkspace(workspace: Workspace) {
    return new WorkspaceSession(workspace, ConditionsBuilder.createFromRegistry(workspace.registry), ConditionsBuilder.createEmpty());
  }

  private constructor(private workspace: Workspace,
              private permanentBuilder: ConditionsBuilder,
              private transientBuilder: ConditionsBuilder) {
    const validArguments =
      workspace.registry === permanentBuilder.registry
      && transientBuilder.registry !== workspace.registry;
    if (!validArguments) {
      throw Error('Expected transient and permanent registry to be distinct');
    }
  }

  /**
   * The method removes a condition from the workspace registry.
   * If it's a simple condition that's trivial. If it's a custom condition, a few invariants must be
   * maintained, in order for the removal and addition logic to remain simple.
   * 1. The user sees directly only named conditions.
   * 2. Named conditions are the only ones that can be referenced in the editor.
   * 3. When referenced a named node(condition) maintains a referenced_by list, containing the ids
   *    of the conditions making use of this NamedCondition. (Similar to smart pointers in certain
   *    languages). This list is modified when a reference is made/removed. Removing a named
   *    condition is not allowed if it is referenced.
   * 4. Unnamed condition nodes don't have a referenced_by list, since they're only referenced once.
   *    (They're created again and again within each custom named condition, and are removed together
   *     with the named condition, they're in). However, they can reference named conditions.
   */
  removeCondition(conditionId: string): boolean {
    const registry = this.permanentBuilder.registry;
    const rootCondition = registry.fetch(conditionId);
    const namedConditions = this.workspace.conditions;
    const namedCondition = namedConditions[rootCondition.name];
    const workspace = this.workspace;
    if (!namedCondition.canRemove()) {
      return false;
    }
    const deletedDefs = this.permanentBuilder.removeCondition(conditionId);

    // Once we've learned which defs we've deleted,
    // we need to fix the namedConditions registry.
    // TO do that, we check which deleted conditions
    // are MultiComposites that refer to named conditions
    // and then update the reference count on those named conditions
    deletedDefs.map(def => {
      if (def.type === 'not') {
        return [[def.id, def.value]];
      } else if (def.type === 'and' || def.type === 'or') {
        return def.values.map(value => [def.id, value]);
      }
      return [];
    }).reduce((total, defArray) => {
      return total.concat(defArray);
    }).forEach(pair => {
      const [parentId, childId] = pair;
      const child = this.workspace.registry.fetch(childId);
      if (child.name !== '') {
        this.workspace.conditions[child.name].removeReference(parentId);
      }
    });
    return true;
  }

  saveCondition(conditionId: string, overwrite: boolean, oldName: string) {
    const rootNode = this.transientBuilder.registry.fetch(conditionId);

    // Some name/overwrite validation here
    if (!rootNode.name || rootNode.name.length === 0) {
      console.error('Conditions saved from editors must be named.');
      return false;
    }
    if (overwrite && !this.workspace.conditions[oldName]) {
      console.error('Overwriting a non-existent condition.');
      return false;
    }
    if (!overwrite && this.workspace.conditions[rootNode.name]) {
      console.error('This condition would overwrite an existing one!');
      return false;
    }

    if (overwrite) {
      console.error('Removing old version: ', oldName);
      this.removeCondition(this.workspace.conditions[oldName].conditionId);
    }

    const children = ConditionsRegistryUtils.getChildrenArray(this.transientBuilder.registry, conditionId, false);

    const idToNewIds = {};

    // iterate and transfer to nonTransient
    children.forEach((child) => {
      const originalId = child.id;

      switch (child.type) {
        case 'not':
          child.value = idToNewIds[child.value];
          break;
        case 'and':
        case 'or':
          child.values = child.values.map((oldId) => idToNewIds[oldId]);
          break;
      }

      if (child.type === 'reference') {
        idToNewIds[originalId]  = child.value;
      } else {
        idToNewIds[originalId] = this.permanentBuilder.importCondition(child);
      }
    });

    this.workspace.conditions[rootNode.name] = new NamedCondition(rootNode.name, idToNewIds[rootNode.id]);
    return true;
  }

  loadConditionForEdit(conditionId: string) {
    // const sourceRegistry = this.workspace.registry;
    const rootNode = this.workspace.registry.fetch(conditionId);
    // const targetRegistry = this.transientRegistry;
    // const targetFactory = new ConditionsFactory(targetRegistry);
    if (rootNode.name.length === 0) {
      const errMsg = 'Only named conditions can be edited. Aborting... ';
      throw new Error(errMsg);
    }

    const children = ConditionsRegistryUtils.getChildrenArray(this.workspace.registry, conditionId, false);
    // Note that here no complex id mapping is needed, since an empty target registry ensures lack of conflicts
    this.transientBuilder.registry.clear();
    children.forEach(condition => {
      if (condition.id !== rootNode.id && condition.name.length !== 0) {
        this.transientBuilder.buildReference(condition.name);
      } else {
        this.transientBuilder.importCondition(condition);
      }
    });
  }
}
