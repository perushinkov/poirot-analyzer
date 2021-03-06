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
    return this._removeCondition(conditionId, false);
  }

  /** Casual wrapper, since saveCondition needs to call this method with super privileges. **/
  private _removeCondition(conditionId: string, duringSave: boolean): ErrorStatus {
    const [rootCondition, errorStatus] = this.fetchIfValid(conditionId);
    if (errorStatus && !duringSave) {
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

  saveCondition(conditionId: string, updateExisting: boolean, oldName: string): ErrorStatus {
    const editRegistry = this.transientBuilder.registry;
    if (editRegistry.size() === 0) {
      return {code: 'NOT_EDITING', msg: 'Edit registry is empty. Nothing to save!'};
    }
    const rootNode = this.transientBuilder.registry.fetch(conditionId);
    if (rootNode === null) {
      return {code: 'ID_NOT_FOUND', msg: 'Reference to non-existent condition in edit registry. Cannot remove.'};
    }
    // Some name/overwrite validation here
    if (!rootNode.name || rootNode.name.length === 0) {
      return {code: 'UNNAMED_ID', msg: 'Only a named condition can be saved.'};
    }

    const oldNameExists = this.workspace.conditions.hasOwnProperty(oldName);
    const newNameExists = this.workspace.conditions.hasOwnProperty(rootNode.name);
    const nameChange = oldName !== rootNode.name;
    if (updateExisting && !oldNameExists) {
      return {code: 'MISSING_ORIGINAL', msg: 'Original condition is missing. Cannot perform override!'};
    }

    const newConditionHasConflictingName = newNameExists && !updateExisting;
    const conditionRenameToConflictingName = newNameExists && updateExisting && nameChange;
    if (newConditionHasConflictingName || conditionRenameToConflictingName) {
      return {code: 'NAME_IN_USE', msg: 'A condition already exists under this name.'};
    }


    const children = ConditionsRegistryUtils.getChildrenArray(this.transientBuilder.registry, conditionId, false);

    // Validate references first
    const badRef = children.find(def => {
      if (def.type === 'reference') {
        return !this.workspace.conditions.hasOwnProperty(def.value);
      }
      return false;
    });
    if (badRef !== undefined) {
      return {code: 'BROKEN_REF', msg: 'Condition contains a reference to a non-existent condition.'};
    }

    if (updateExisting) {
      this._removeCondition(this.workspace.conditions[oldName].conditionId, true);
    }
    const idToNewIds = {};
    const referenceIds = {};
    // iterate and transfer to nonTransient

    children.forEach((child) => {
      const originalId = child.id;

      // 1. Id remapping
      switch (child.type) {
        case 'not':
          child.value = idToNewIds[child.value];
          break;
        case 'and':
        case 'or':
          child.values = child.values.map(oldId => idToNewIds[oldId]);
          break;
      }

      // 2. Importing
      if (child.type === 'reference') {
        idToNewIds[originalId] = this.workspace.conditions[child.value].conditionId;
        referenceIds[idToNewIds[originalId]] = child.value;
      } else {
        idToNewIds[originalId] = this.permanentBuilder.importCondition(child).id;
      }

      // 3. Reference keeping
      // Note: This doesn't handle the irregular case where values has duplicate ids.
      //       It is the factory's job to ensure the consistency.
      switch (child.type) {
        case 'not': {
          const referencedName = referenceIds[child.value];
          if (referencedName) {
            this.workspace.conditions[referencedName].addReference(idToNewIds[originalId]);
          }
          break;
        }
        case 'and':
        case 'or':
          child.values.forEach(childId => {
            const referencedName = referenceIds[childId];
            if (referencedName) {
              this.workspace.conditions[referencedName].addReference(idToNewIds[originalId]);
            }
          });
          break;
      }
    });

    this.workspace.conditions[rootNode.name] = new NamedCondition(rootNode.name, idToNewIds[rootNode.id]);
    this.transientBuilder.registry.clear();
    return null;
  }

  /**
   * NOTE:
   *  Since the root condition is the last def to be transferred to the transient registry,
   *  Fetching the root def from the transient registry after save is as easy as:
   *    transientRegistry.fetch(transientRegistry.lastId())
   */
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
