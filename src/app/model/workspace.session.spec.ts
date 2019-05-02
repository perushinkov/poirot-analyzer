import {RemoveStatus, WorkspaceSession} from './workspace.session';
import {Workspace} from './workspace';
import {ConditionsBuilder} from './conditions.builder';
import {SAMPLES} from './test-data/workspace.tdata';
import {ConditionsRegistry} from './conditions.registry';
import {ConditionsRegistryUtils} from './conditions.registry.utils';

describe('WorkspaceSession', () => {
  let componentUnderTest: WorkspaceSession;
  let workspace: Workspace;
  let transientRegistry: ConditionsRegistry;
  let permaBuilder: ConditionsBuilder;
  let editBuilder: ConditionsBuilder;
  let originalConditionsCopy;

  Given(() => {
    workspace = SAMPLES.workspace();
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

  describe('METHOD: removeCondition', () => {
    let removeIds: string[];
    let removeStatuses: RemoveStatus[];

    When(() => {
      removeStatuses = removeIds.map(removeId => componentUnderTest.removeCondition(removeId));
    });

    // Fail cases... Is error codes okay? Should I switch to exceptions? Keep in mind when future reworks/issues arise
    describe('bad condition id should lead to remove failure', () => {
      Given(() => {
        removeIds = [null, ''];
      });
      Then(() => {
        expect(removeStatuses.map(status => status.error)).toEqual([true, true]);
        expect(removeStatuses.map(status => status.code)).toEqual(['BAD_ID', 'BAD_ID']);
        expect(originalConditionsCopy).toEqual(workspace.conditions);
      });
    });
    describe('Non empty transient registry should lead to remove failure', () => {
      Given(() => {
        removeIds = ['2', '3'];
        editBuilder.buildBool(true, 'Some_random_bool');
      });
      Then(() => {
        expect(removeStatuses.map(status => status.error)).toEqual([true, true]);
        expect(removeStatuses.map(status => status.code)).toEqual(['EDIT_IN_PROGRESS', 'EDIT_IN_PROGRESS']);
        expect(originalConditionsCopy).toEqual(workspace.conditions);
      });
    });
    describe('Missing condition id should result in remove failure', () => {
      Given(() => {
        removeIds = ['apple', 'pear'];
      });
      Then(() => {
        expect(removeStatuses.map(status => status.error)).toEqual([true, true]);
        expect(removeStatuses.map(status => status.code)).toEqual(['ID_NOT_FOUND', 'ID_NOT_FOUND']);
        expect(originalConditionsCopy).toEqual(workspace.conditions);
      });
    });
    describe('Removing an unnamed condition def should result in a remove failure', () => {
      Given(() => {
        removeIds = ['1', '6'];
      });
      Then(() => {
        expect(removeStatuses.map(status => status.error)).toEqual([true, true]);
        expect(removeStatuses.map(status => status.code)).toEqual(['UNNAMED_ID', 'UNNAMED_ID']);
        expect(originalConditionsCopy).toEqual(workspace.conditions);
      });
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
        expect(removeStatuses.map(status => status.error)).toEqual([true]);
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
      });
    });
    describe('Removing a complex named without references to named', () => {
      let beforeRegistrySize;
      Given(() => {
        beforeRegistrySize = workspace.registry.size();
        removeIds = ['3', '7'];
      });
      Then(() => {
        const expectedRegistry = SAMPLES.registry();
        ['1', '3', '6', '7'].forEach(id => expectedRegistry.remove(id));
        expect(workspace.registry.getShallowCopy()).toEqual(expectedRegistry.getShallowCopy());
        expect(workspace.conditions).toEqual(ConditionsRegistryUtils.buildNamedConditions(workspace.registry));
        expect(beforeRegistrySize).toEqual(workspace.registry.size()  + 4);
      });
    });
    describe('Removing a complex named with direct and indirect references to named', () => {
      let oldRegistrySize;
      Given(() => {
        removeIds = ['10'];
        permaBuilder.buildBool(false); // id: '8'
        permaBuilder.buildNot('2'); // id: '9'
        permaBuilder.buildAnd(['7', '8', '9'], 'andy'); // id: '10'
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
      });

    });
  });
});
// TODO: Unnamed conditions should only be part of 1 complex named condition tree.
//       No reuse is allowed. Make a verify registry on save/load.
//       Perhaps integrate it in buildConditionsFromRegistry?

// TODO: Creating cyclic references shouldn't be possible. Consider where this
//       could possibly be enforced, and/or detected.
