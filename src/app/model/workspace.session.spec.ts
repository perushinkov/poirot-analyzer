import {ErrorStatus, WorkspaceSession} from './workspace.session';
import {Workspace} from './workspace';
import {ConditionsBuilder} from './conditions.builder';
import {SAMPLES} from './test-data/workspace.tdata';
import {ConditionsRegistry} from './conditions.registry';
import {ConditionsRegistryUtils} from './conditions.registry.utils';
import { MonoCompositeDef, SingleDef } from './defs';
import { NamedCondition } from './named.condition';

describe('WorkspaceSession', () => {
  let componentUnderTest: WorkspaceSession;
  let workspace: Workspace;
  let transientRegistry: ConditionsRegistry;
  let permaBuilder: ConditionsBuilder;
  let editBuilder: ConditionsBuilder;
  let originalConditionsCopy;
  let originalRegistryCopy;



  Given(() => {
    workspace = SAMPLES.workspace();
    originalRegistryCopy = SAMPLES.registry();
    permaBuilder = ConditionsBuilder.createFromRegistry(workspace.registry);
    originalConditionsCopy = ConditionsRegistryUtils.buildNamedConditions(workspace.registry); // easier than copying
    transientRegistry = new ConditionsRegistry();
    editBuilder = ConditionsBuilder.createFromRegistry(transientRegistry);
  });

  describe('Construction', () => {
    let ctorFunc;
    describe('Construction should throw if perma registry is edit registry', () => {
      When(() => {
        ctorFunc = () => componentUnderTest = WorkspaceSession.createForTest(workspace, editBuilder, editBuilder);
      });
      Then(() => {
        expect(ctorFunc).toThrowError('Transient and permanent registry should not be the same object');
      });
    });

    describe('Construction should clear transient registry', () => {
      Given(() => {
        transientRegistry.register({id: '1', type: 'bool', value: true, name: 'Cake'});
      });
      When(() => {
        ctorFunc = () => componentUnderTest = WorkspaceSession.createForTest(workspace, permaBuilder, editBuilder);
        ctorFunc();
      });
      Then(() => {
        expect(transientRegistry.size()).toEqual(0);
      });
    });
  });

  Given(() => {
    componentUnderTest = WorkspaceSession.createForTest(workspace, permaBuilder, editBuilder);
  });

  describe('Prerequisites: removeCondition/loadConditionForEdit', () => {
    let removeStatuses: ErrorStatus[];
    let loadStatuses: ErrorStatus[];
    let inputIds: string[];
    let originalRegistryObj;

    Given(() => {
      originalRegistryObj = SAMPLES.registry().getShallowCopy();
    });
    When(() => {
      removeStatuses = inputIds.map(removeId => componentUnderTest.removeCondition(removeId));
      loadStatuses = inputIds.map(loadId => componentUnderTest.loadConditionForEdit(loadId));
    });

    // Fail cases... Is error codes okay? Should I switch to exceptions? Keep in mind when future reworks/issues arise
    describe('bad condition id should lead to remove/load failure', () => {
      Given(() => {
        inputIds = [null, ''];
      });
      Then(() => {
        expect(removeStatuses.map(status => status.code)).toEqual(['BAD_ID', 'BAD_ID']);
        expect(loadStatuses.map(status => status.code)).toEqual(['BAD_ID', 'BAD_ID']);
        expect(originalConditionsCopy).toEqual(workspace.conditions);
        expect(originalRegistryObj).toEqual(workspace.registry.getShallowCopy());
      });
    });
    describe('Non empty transient registry should lead to remove/load failure', () => {
      Given(() => {
        inputIds = ['2', '3'];
        editBuilder.buildBool(true, 'Some_random_bool');
      });
      Then(() => {
        expect(removeStatuses.map(status => status.code)).toEqual(['EDIT_IN_PROGRESS', 'EDIT_IN_PROGRESS']);
        expect(loadStatuses.map(status => status.code)).toEqual(['EDIT_IN_PROGRESS', 'EDIT_IN_PROGRESS']);
        expect(originalConditionsCopy).toEqual(workspace.conditions);
        expect(originalRegistryObj).toEqual(workspace.registry.getShallowCopy());
      });
    });
    describe('Missing condition id should result in remove/load failure', () => {
      Given(() => {
        inputIds = ['apple', 'pear'];
      });
      Then(() => {
        expect(removeStatuses.map(status => status.code)).toEqual(['ID_NOT_FOUND', 'ID_NOT_FOUND']);
        expect(loadStatuses.map(status => status.code)).toEqual(['ID_NOT_FOUND', 'ID_NOT_FOUND']);
        expect(originalConditionsCopy).toEqual(workspace.conditions);
        expect(originalRegistryObj).toEqual(workspace.registry.getShallowCopy());
      });
    });
    describe('An unnamed condition def should result in a remove/load failure', () => {
      Given(() => {
        inputIds = ['1', '6'];
      });
      Then(() => {
        expect(removeStatuses.map(status => status.code)).toEqual(['UNNAMED_ID', 'UNNAMED_ID']);
        expect(loadStatuses.map(status => status.code)).toEqual(['UNNAMED_ID', 'UNNAMED_ID']);
        expect(originalConditionsCopy).toEqual(workspace.conditions);
        expect(originalRegistryObj).toEqual(workspace.registry.getShallowCopy());
      });
    });
  });

  describe('METHOD: removeCondition', () => {
    let removeStatuses: ErrorStatus[];
    let removeIds: string[];

    When(() => {
      removeStatuses = removeIds.map(removeId => componentUnderTest.removeCondition(removeId));
    });

    describe('Removing a named, referenced condition def should fail', () => {
      Given(() => {
        removeIds = ['6'];
        workspace.registry.fetch('6').name = 'is_true';
        // NOTE: This relies on buildNamedConditions working properly
        workspace.conditions = ConditionsRegistryUtils.buildNamedConditions(workspace.registry);
        originalConditionsCopy = ConditionsRegistryUtils.buildNamedConditions(workspace.registry);
      });
      Then(() => {
        expect(removeStatuses.map(status => status.code)).toEqual(['REFERENCED']);
        expect(workspace.conditions).toEqual(originalConditionsCopy);
      });

    });
    // Positive cases:
    describe('Removing a simple named condition', () => {
      let expectedConditions, expectedConditions2;
      Given(() => {
        removeIds = ['2', '4', '5'];
      });
      Then(() => {
        // Setting up expected conditions:
        expectedConditions = originalConditionsCopy;
        const registry = SAMPLES.registry();
        removeIds
          .map(removeId => registry.fetch(removeId).name)
          .forEach(name => delete expectedConditions[name]);
        expectedConditions2 = ConditionsRegistryUtils.buildNamedConditions(workspace.registry);

        expect(workspace.conditions).toEqual(expectedConditions);
        expect(workspace.conditions).toEqual(expectedConditions2);
        const expectedRegistry = SAMPLES.registry().getShallowCopy();
        removeIds.forEach(id => delete expectedRegistry[id]);
        expect(workspace.registry.getShallowCopy()).toEqual(expectedRegistry);
        expect(removeStatuses).toEqual([null, null, null]);
      });
    });
    describe('Removing a complex named without references to named', () => {
      let beforeRegistrySize;
      Given(() => {
        workspace.registry.remove('8');
        workspace.registry.remove('9');
        workspace.conditions = ConditionsRegistryUtils.buildNamedConditions(workspace.registry);
        beforeRegistrySize = workspace.registry.size();
        removeIds = ['3', '7'];
      });
      Then(() => {
        const expectedRegistry = SAMPLES.registry();
        ['1', '3', '6', '7', '8', '9'].forEach(id => expectedRegistry.remove(id));
        expect(workspace.registry.getShallowCopy()).toEqual(expectedRegistry.getShallowCopy());
        expect(workspace.conditions).toEqual(ConditionsRegistryUtils.buildNamedConditions(workspace.registry));
        expect(beforeRegistrySize).toEqual(workspace.registry.size()  + 4);
        expect(removeStatuses).toEqual([null, null]);
      });
    });
    describe('Removing a complex named with direct and indirect references to named', () => {
      let oldRegistrySize;
      Given(() => {
        const falseId = permaBuilder.buildBool(false).id;
        const not2 = permaBuilder.buildNot('2').id;
        permaBuilder.buildAnd(['7', falseId, not2], 'andy');
        removeIds = [permaBuilder.registry.lastId];
        workspace.conditions = ConditionsRegistryUtils.buildNamedConditions(workspace.registry);
        originalConditionsCopy = ConditionsRegistryUtils.buildNamedConditions(workspace.registry);
        oldRegistrySize = workspace.registry.size();
      });
      Then(() => {
        expect(oldRegistrySize).toEqual(workspace.registry.size() + 3);
        const expectedRegistry = SAMPLES.registry();
        const expectedConditions = ConditionsRegistryUtils.buildNamedConditions(expectedRegistry);
        expect(workspace.registry.getShallowCopy()).toEqual(expectedRegistry.getShallowCopy());
        expect(workspace.conditions).toEqual(expectedConditions);
        expect(removeStatuses).toEqual([null]);
      });
    });
  });

  describe('METHOD: loadConditionForEdit', () => {
    let editConditionId: string;
    let errorStatus: ErrorStatus;
    When(() => {
      errorStatus = componentUnderTest.loadConditionForEdit(editConditionId);
    });
    describe('Loading a simple condition', () => {
      Given(() => {
        editConditionId = '2';
      });
      Then(() => {
        const expectedBuilder = ConditionsBuilder.createEmpty();
        expectedBuilder.buildIdentity('country', 'US', 'is_US');
        expect(editBuilder.registry.getShallowCopy()).toEqual(expectedBuilder.registry.getShallowCopy());
        expect(errorStatus).toBeNull();
      });
    });
    describe('Loading a complex condition without references', () => {
      Given(() => {
        editConditionId = '3';
      });
      Then(() => {
        const expectedBuilder = ConditionsBuilder.createEmpty();
        expectedBuilder.buildNot(expectedBuilder.buildIdentity('country', 'BG').id, 'is_not_BG');
        expect(editBuilder.registry.getShallowCopy()).toEqual(expectedBuilder.registry.getShallowCopy());
        expect(errorStatus).toBeNull();
      });
    });
    describe('Loading a complex condition with references', () => {
      Given(() => {
        const falseId = permaBuilder.buildBool(false).id;
        const notTwoId = permaBuilder.buildNot('2').id;
        permaBuilder.buildAnd(['7', falseId, notTwoId], 'andy');
        editConditionId = permaBuilder.registry.lastId;
        workspace.conditions = ConditionsRegistryUtils.buildNamedConditions(workspace.registry);
      });
      Then(() => {
        const expectedBuilder = ConditionsBuilder.createEmpty();
        expectedBuilder.buildAnd([
          expectedBuilder.buildReference('cake_not_is_true').id,
          expectedBuilder.buildBool(false).id,
          expectedBuilder.buildNot(
            expectedBuilder.buildReference('is_US').id
          ).id
        ], 'andy');
        expect(editBuilder.registry.getShallowCopy()).toEqual(expectedBuilder.registry.getShallowCopy());
        expect(errorStatus).toBeNull();
      });
    });
  });

  describe('METHOD: saveCondition', () => {
    let savedId: string;
    let overwrite: boolean;
    let oldName: string;
    let errorStatus: ErrorStatus;
    let preCallRegistry, afterCallRegistry;
    let preCallEditRegistry, afterCallEditRegistry;
    When(() => {
      preCallRegistry = permaBuilder.registry.getShallowCopy();
      preCallEditRegistry = editBuilder.registry.getShallowCopy();

      errorStatus = componentUnderTest.saveCondition(savedId, overwrite, oldName);

      afterCallRegistry = permaBuilder.registry.getShallowCopy();
      afterCallEditRegistry = editBuilder.registry.getShallowCopy();
    });

    describe('edit registry must be non-empty', () => {
      Then(() => {
        expect(errorStatus.code).toEqual('NOT_EDITING');
        expect(preCallRegistry).toEqual(afterCallRegistry);
      });
    });
    describe('savedId must be existent in the edit registry', () => {
      Given(() => {
        componentUnderTest.loadConditionForEdit('2');
        [savedId, overwrite, oldName] = ['nonexistent_id', true, 'someName'];
      });
      Then(() => {
        expect(errorStatus.code).toEqual('ID_NOT_FOUND');
        expect(preCallRegistry).toEqual(afterCallRegistry);
        expect(preCallEditRegistry).toEqual(afterCallEditRegistry);
      });
    });
    describe('savedId must be of a named condition in the edit registry', () => {
      Given(() => {
        componentUnderTest.loadConditionForEdit('3');
        [savedId, overwrite, oldName] = ['1', true, 'someName'];
      });
      Then(() => {
        expect(errorStatus.code).toEqual('UNNAMED_ID');
        expect(preCallRegistry).toEqual(afterCallRegistry);
        expect(preCallEditRegistry).toEqual(afterCallEditRegistry);
      });
    });
    describe('saved condition must not contain broken references', () => {
      Given(() => {
        const editConditionId = editBuilder.buildAnd([
          editBuilder.buildReference('reliability_above_half').id,
          editBuilder.buildReference('is_USSR').id
        ], 'name_does_not_matter').id;
        [savedId, overwrite, oldName] = [editConditionId, false, null];
      });
      Then(() => {
        expect(errorStatus.code).toEqual('BROKEN_REF');
        expect(preCallRegistry).toEqual(afterCallRegistry);
        expect(preCallEditRegistry).toEqual(afterCallEditRegistry);
      });

    });

    describe('When creating a new condition', () => {
      Given(() => {
        overwrite = false;
      });
      describe('New condition should not have a conflicting name', () => {
        Given(() => {
          const newConditionId = editBuilder.buildNot(
            editBuilder.buildBool(false).id,
            'reliability_above_half').id;
          [savedId, oldName] = [newConditionId, null];
        });
        Then(() => {
          expect(errorStatus.code).toEqual('NAME_IN_USE');
          expect(preCallRegistry).toEqual(afterCallRegistry);
          expect(preCallEditRegistry).toEqual(afterCallEditRegistry);
        });
      });
      describe('Should save newly created condition', () => {
        const CONDITION_NAME = 'gold_digger_criterion';
        Given(() => {
          const newConditionId = editBuilder.buildAnd([
            editBuilder.buildReference('is_not_BG').id,
            editBuilder.buildOr([
              editBuilder.buildBetween('age', {range: [25, 30], included: [1, 1]}).id,
              editBuilder.buildComparison('savings', {operator: '>', value: 1000000}).id
            ]).id
          ], CONDITION_NAME).id;
          [savedId, oldName] = [newConditionId, null];
        });
        Then(() => {
          expect(afterCallEditRegistry).toEqual({});
          const newCondition = workspace.conditions[CONDITION_NAME];
          expect(NamedCondition.toString(newCondition)).toEqual(JSON.stringify({
            name: CONDITION_NAME,
            conditionId: newCondition.conditionId,
            references: []
          }));

          const savedConditionSignature = ConditionsRegistryUtils
            .getChildrenArray(permaBuilder.registry, newCondition.conditionId, false)
            .map(def => {
              return {type: def.type, name: def.name};
            });
          expect(savedConditionSignature).toEqual([
            {type: 'not', name: 'is_not_BG'},
            {type: 'between', name: ''},
            {type: 'comparison', name: ''},
            {type: 'or', name: ''},
            {type: 'and', name: CONDITION_NAME}
          ]);
          expect(ConditionsRegistryUtils.integrityCheck(workspace.registry, workspace.conditions)).toBeTruthy();
        });
      });
      describe('Should save condition created from existing', () => {
        const CONDITION_TO_MODIFY = 'cake_is_a_lie_or_false';
        const NEW_NAME = CONDITION_TO_MODIFY + '_modified';
        Given(() => {
          const conditionIdToModify = workspace.conditions[CONDITION_TO_MODIFY].conditionId;
          componentUnderTest.loadConditionForEdit(conditionIdToModify);
          const editNode = editBuilder.registry.fetch(editBuilder.registry.lastId);
          editNode.name = NEW_NAME;
          [savedId, oldName] = [editNode.id, CONDITION_TO_MODIFY];
        });
        Then(() => {
          expect(afterCallEditRegistry).toEqual({});
          const newCondition = workspace.conditions[NEW_NAME];
          expect(NamedCondition.toString(newCondition)).toEqual(JSON.stringify({
            name: NEW_NAME,
            conditionId: newCondition.conditionId,
            references: []
          }));
          const savedConditionSignature = ConditionsRegistryUtils
            .getChildrenArray(permaBuilder.registry, newCondition.conditionId, false)
            .map(def => {
              return {type: def.type, name: def.name};
            });
          expect(savedConditionSignature).toEqual([
            {type: 'not', name: 'cake_not_is_true'},
            {type: 'bool', name: ''},
            {type: 'or', name: NEW_NAME}
          ]);
          expect(ConditionsRegistryUtils.integrityCheck(workspace.registry, workspace.conditions)).toBeTruthy();
        });
      });
    });
    describe('When editing existing condition', () => {
      Given(() => {
        overwrite = true;
      });
      describe('Original condition must not be missing', () => {
        Given(() => {
          componentUnderTest.loadConditionForEdit('2');
          const mappedId = transientRegistry.fetch(transientRegistry.lastId).id;
          [savedId, oldName] = [mappedId, 'is_USSR'];
        });
        Then(() => {
          expect(errorStatus.code).toEqual('MISSING_ORIGINAL');
          expect(preCallRegistry).toEqual(afterCallRegistry);
          expect(preCallEditRegistry).toEqual(afterCallEditRegistry);
        });
      });
      describe('Condition cannot be renamed to a name in use', () => {
        Given(() => {
          componentUnderTest.loadConditionForEdit('3');
          // Introducing modification to ensure it's not saved
          const is_BG = transientRegistry.fetch('1') as SingleDef;
          is_BG.value = 'DE';
          const editRootId = transientRegistry.fetch(transientRegistry.lastId).id;
          [savedId, oldName] = [editRootId, 'reliability_above_half'];
        });
        Then(() => {
          expect(errorStatus.code).toEqual('NAME_IN_USE');
          expect(preCallRegistry).toEqual(afterCallRegistry);
          expect(preCallEditRegistry).toEqual(afterCallEditRegistry);
        });
      });
      describe('Should save renamed condition', () => {
        const CONDITION_TO_RENAME = 'is_not_BG';
        const NEW_NAME = CONDITION_TO_RENAME + '_renamed';
        Given(() => {
          const conditionIdToModify = workspace.conditions[CONDITION_TO_RENAME].conditionId;
          componentUnderTest.loadConditionForEdit(conditionIdToModify);
          const editNode = editBuilder.registry.fetch(editBuilder.registry.lastId);
          editNode.name = NEW_NAME;
          [savedId, oldName] = [editNode.id, CONDITION_TO_RENAME];
        });
        Then(() => {
          expect(afterCallEditRegistry).toEqual({});
          const newCondition = workspace.conditions[NEW_NAME];
          expect(NamedCondition.toString(newCondition)).toEqual(JSON.stringify({
            name: NEW_NAME,
            conditionId: newCondition.conditionId,
            references: []
          }));
          const savedConditionSignature = ConditionsRegistryUtils
            .getChildrenArray(permaBuilder.registry, newCondition.conditionId, false)
            .map(def => {
              return {type: def.type, name: def.name};
            });
          expect(savedConditionSignature).toEqual([
            {type: 'identity', name: ''},
            {type: 'not', name: NEW_NAME}
          ]);
          expect(ConditionsRegistryUtils.integrityCheck(workspace.registry, workspace.conditions)).toBeTruthy();
        });
      });
      describe('Should save modified condition', () => {
        const CONDITION_TO_MODIFY = 'is_not_BG';
        Given(() => {
          const conditionIdToModify = workspace.conditions[CONDITION_TO_MODIFY].conditionId;
          componentUnderTest.loadConditionForEdit(conditionIdToModify);
          const editNode = editBuilder.registry.fetch(editBuilder.registry.lastId) as MonoCompositeDef;
          editBuilder.removeCondition(editNode.value);
          editNode.value = editBuilder.buildReference('is_US').id;
          [savedId, oldName] = [editNode.id, CONDITION_TO_MODIFY];
          workspace.conditions = ConditionsRegistryUtils.buildNamedConditions(workspace.registry);
        });
        Then(() => {
          expect(afterCallEditRegistry).toEqual({});
          const newCondition = workspace.conditions[CONDITION_TO_MODIFY];
          expect(NamedCondition.toString(newCondition)).toEqual(JSON.stringify({
            name: CONDITION_TO_MODIFY,
            conditionId: newCondition.conditionId,
            references: []
          }));
          const savedConditionSignature = ConditionsRegistryUtils
            .getChildrenArray(permaBuilder.registry, newCondition.conditionId, false)
            .map(def => {
              return {type: def.type, name: def.name};
            });
          expect(savedConditionSignature).toEqual([
            {type: 'identity', name: 'is_US'},
            {type: 'not', name: CONDITION_TO_MODIFY}
          ]);
          expect(ConditionsRegistryUtils.integrityCheck(workspace.registry, workspace.conditions)).toBeTruthy();
        });
      });
    });
  });
});
// TODO: Unnamed conditions should only be part of 1 complex named condition tree.
//       No reuse is allowed. Make a verify registry on save/load.
//       Perhaps integrate it in buildConditionsFromRegistry?
// TODO: Creating cyclic references shouldn't be possible. Consider where this
//       could possibly be enforced, and/or detected.


