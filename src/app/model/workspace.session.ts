import {ConditionsBuilder} from './conditions.builder';
import {Workspace} from './workspace';
import {ConditionsRegistryUtils} from './conditions.registry.utils';
import {NamedCondition} from './named.condition';
import {ConditionDef} from './defs';

export interface ErrorStatus {
  code?: string; // spec should test for code... msg is supposed to be user friendly, and is subject to change in i18n
  msg?: string;
}

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
      throw Error('Transient and permanent registry should not be the same object');
    }
    transientBuilder.registry.clear();
  }

  private fetchIfValid(conditionId: string): [ConditionDef, ErrorStatus] {
    let errorStatus: ErrorStatus = null;
    const rootCondition = this.workspace.registry.fetch(conditionId);

    if (!conditionId || conditionId === '') {
      errorStatus = {code: 'BAD_ID', msg: 'invalid conditionId in removeCondition operation'};
    } else if (this.transientBuilder.registry.size() > 0) {
      errorStatus = {code: 'EDIT_IN_PROGRESS', msg: 'cannot remove condition while an edit is in progress'};
    } else if (rootCondition === null) {
      errorStatus = {code: 'ID_NOT_FOUND', msg: 'Condition with that id not found in registry'};
    } else if (!this.workspace.conditions.hasOwnProperty(rootCondition.name)) {
      errorStatus = {code: 'UNNAMED_ID', msg: 'Can only remove named conditions.'};
    } else if (!this.workspace.conditions[rootCondition.name].canRemove()) {
      errorStatus = {code: 'REFERENCED', msg: 'Cannot remove referenced named condition'};
    }

    return [rootCondition, errorStatus];
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
   * 5. No conditions should be under edit when a condition is removed (conflict-avoidance)
   * 6. Unnamed condition definitions in the registry that are not referenced by a single other condition def should be impossible!
   */
  removeCondition(conditionId: string): ErrorStatus {
    const [rootCondition, errorStatus] = this.fetchIfValid(conditionId);
    if (errorStatus) {
      return errorStatus;
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
      // Since unnamed children get removed, the second check is superfluous, but makes reading easier (Should I keep it?)
      if (child !== null && child.name !== '') {
        this.workspace.conditions[child.name].removeReference(parentId);
      }
    });
    delete this.workspace.conditions[rootCondition.name];
    return null;
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
        idToNewIds[originalId] = this.permanentBuilder.importCondition(child).id;
      }
    });

    this.workspace.conditions[rootNode.name] = new NamedCondition(rootNode.name, idToNewIds[rootNode.id]);
    return true;
  }

  loadConditionForEdit(conditionId: string): ErrorStatus {
    const [rootCondition, errorStatus] = this.fetchIfValid(conditionId);
    if (errorStatus) {
      return errorStatus;
    }
    const children = ConditionsRegistryUtils.getChildrenArray(this.workspace.registry, conditionId, false);
    // Note that here no complex id mapping is needed, since an empty target registry ensures lack of conflicts
    this.transientBuilder.registry.clear();
    const oldIdToNewIdMap = {};
    children.forEach(condition => {
      let newId: string;
      if (condition.id !== rootCondition.id && condition.name.length !== 0) {
        newId = this.transientBuilder.buildReference(condition.name).id;
      } else {
        const importedDef = this.transientBuilder.importCondition(condition);
        newId = importedDef.id;
        if (importedDef.type === 'not') {
          importedDef.value = oldIdToNewIdMap[importedDef.value];
        } else if (importedDef.type === 'or' || importedDef.type === 'and') {
          importedDef.values = importedDef.values.map(id => oldIdToNewIdMap[id]);
        }
      }
      oldIdToNewIdMap[condition.id] = newId;
    });
    return null;
  }
}
