import {ConditionsBuilder} from './conditions.builder';
import {ConditionsRegistry} from './conditions.registry';
import SpyObj = jasmine.SpyObj;
import {IdGenerator} from './id.generator';

describe('ConditionsBuilder', () => {
  let componentUnderTest: ConditionsBuilder;

  // For now this method  only as a documentation
  describe('Build methods work as expected', () => {
    let actualValues, expectedValues;
    let mockRegistry: SpyObj<ConditionsRegistry>;
    let mockIdGenerator: SpyObj<IdGenerator>;

    Given(() => {
      mockRegistry = jasmine.createSpyObj('ConditionsRegistry', ['register']);
      mockIdGenerator = jasmine.createSpyObj('IdGenerator', ['nextId']);
      mockIdGenerator.nextId.and.returnValue('test_id');
      componentUnderTest = ConditionsBuilder.createForTest(mockIdGenerator, mockRegistry);
    });

    describe('Testing pure construction methods', () => {
      When(() => {
        actualValues = {
          'single.identity': componentUnderTest.buildIdentity('nationality', 'BG', 'A fellow countryman of mine!'),
          'single.comparison': componentUnderTest.buildComparison('salary', {operator: '>', value: 10000}, 'An okay salary... I guess'),
          'single.between': componentUnderTest.buildBetween('age', {range: [18, 65], included: [0, 1]}, '18 -> 65'),
          'multi.values': componentUnderTest.buildValues('name', ['Annie', 'Joe'], 'split by Annie and Joe'),
          'multi.enums': componentUnderTest.buildEnums('numbers', [[1, 3, 5], [2, 4]], 'Odd vs even'),
          'multi.ranges': componentUnderTest.buildRanges('age', [18, 65], 'okay age for a driver'),
          'composite.and': componentUnderTest.buildAnd(['id1', 'id2', 'id3'], 'The good, the bad and the ugly!'),
          'composite.or': componentUnderTest.buildOr(['id1', 'id2', 'id3'], 'The good, the bad or the ugly!'),
          'composite.not': componentUnderTest.buildNot('id1', 'Not the good'),
          'composite.bool': componentUnderTest.buildBool(true),
          'internal.reference': componentUnderTest.buildReference('Name of condition')
        };
      });
      Then(() => {
        expectedValues = {
          'single.identity': {id: 'test_id', name: 'A fellow countryman of mine!', type: 'identity', property: 'nationality', value: 'BG'},
          'single.comparison': {
            id: 'test_id', name: 'An okay salary... I guess', type: 'comparison', property: 'salary', value: {operator: '>', value: 10000}
          },
          'single.between': {
            id: 'test_id',
            name: '18 -> 65',
            type: 'between',
            property: 'age',
            value: {range: [18, 65], included: [0, 1]}
          },
          'multi.values': {id: 'test_id', name: 'split by Annie and Joe', type: 'values', property: 'name', values: ['Annie', 'Joe']},
          'multi.enums': {id: 'test_id', name: 'Odd vs even', type: 'enums', property: 'numbers', values: [[1, 3, 5], [2, 4]]},
          'multi.ranges': {id: 'test_id', name: 'okay age for a driver', type: 'ranges', property: 'age', values: [18, 65]},
          'composite.and': {id: 'test_id', name: 'The good, the bad and the ugly!', type: 'and', values: ['id1', 'id2', 'id3']},
          'composite.or': {id: 'test_id', name: 'The good, the bad or the ugly!', type: 'or', values: ['id1', 'id2', 'id3']},
          'composite.not': {id: 'test_id', name: 'Not the good', type: 'not', value: 'id1'},
          'composite.bool': {id: 'test_id', name: '', type: 'bool', value: true},
          'internal.reference': {id: 'test_id', name: 'Name of condition', type: 'reference', value: 'Name of condition'}
        };

        expect(actualValues).toEqual(expectedValues);
        expect(mockIdGenerator.nextId.calls.count()).toEqual(11);
        expect(mockRegistry.register.calls.count()).toEqual(11);
      });
    });

    describe('Import condition', () => {
      let expectedId, testCondition, expectedMigratedCondition;

      Given(() => {
        expectedId = 'the_expected_id';
        mockIdGenerator.nextId.and.returnValue(expectedId);
        testCondition = {
          id: '1',
          type: 'identity',
          property: 'someField',
          name: 'testCondition',
          value: 'testValue'
        };
        expectedMigratedCondition = {...testCondition};
        expectedMigratedCondition.id = expectedId;
      });

      When(() => {
        actualValues = {};
        actualValues.newConditionId = componentUnderTest.importCondition(testCondition);

      });
      Then(() => {
        expect(actualValues.newConditionId).toEqual(expectedId);
        expect(mockRegistry.register.calls.count()).toEqual(1);
        expect(mockRegistry.register.calls.mostRecent().args).toEqual([expectedMigratedCondition]);
        expect(mockIdGenerator.nextId.calls.count()).toEqual(1);
      });
    });
  });

  describe('Remove condition', () => {
    let sampleRegistry: ConditionsRegistry;
    let removeId: string;
    let deletedIds: string[];

    When(() => {
      componentUnderTest = ConditionsBuilder.createFromRegistry(sampleRegistry);
      deletedIds = componentUnderTest.removeCondition(removeId).map(def => def.id);
    });

    describe('When condition is not present', () => {
      let shallowCopyBefore;
      Given(() => {
        removeId = 'missingId';
        sampleRegistry = new ConditionsRegistry();
        const builder = ConditionsBuilder.createFromRegistry(sampleRegistry);
        builder.buildIdentity('color', 'green');
        shallowCopyBefore = sampleRegistry.getShallowCopy();
      });
      Then(() => {
        expect(deletedIds).toEqual([]);
        expect(componentUnderTest.registry.getShallowCopy()).toEqual(shallowCopyBefore);
      });
    });

    describe('When condition is present', () => {
      Given(() => {
        sampleRegistry = new ConditionsRegistry();
        const builder = ConditionsBuilder.createFromRegistry(sampleRegistry);
        removeId = builder.buildIdentity('color', 'green').id;
      });
      Then(() => {
        expect(deletedIds).toEqual([removeId]);
        expect(componentUnderTest.registry.getShallowCopy()).toEqual({});
      });
    });

    describe('When complex condition is present', () => {
      let oldRegistrySize;

      let colorGreenDef;
      let colorBlueDef;
      let notColorGreenDef;
      let notNotColorGreenDef;
      let orColorsDef;
      let andAllDef;

      Given(() => {
        sampleRegistry = new ConditionsRegistry();
        const builder = ConditionsBuilder.createFromRegistry(sampleRegistry);

        colorGreenDef = builder.buildIdentity('color', 'green', 'colourGreen');
        colorBlueDef = builder.buildIdentity('color', 'blue');
        notColorGreenDef = builder.buildNot(colorGreenDef.id);
        notNotColorGreenDef = builder.buildNot(notColorGreenDef.id, 'Double Not');
        orColorsDef = builder.buildOr([colorGreenDef.id, colorBlueDef.id]);
        andAllDef = builder.buildAnd([notNotColorGreenDef.id, orColorsDef.id]);
        oldRegistrySize = sampleRegistry.size();
      });

      describe('Double not with named leaf', () => {
        Given(() => {
          removeId = notNotColorGreenDef.id;
        });
        Then(() => {
          expect(deletedIds).toEqual([notColorGreenDef.id, notNotColorGreenDef.id]);
          const registry = componentUnderTest.registry;
          expect(registry.fetch(notNotColorGreenDef.id)).toBeNull();
          expect(registry.fetch(notColorGreenDef.id)).toBeNull();
          expect(registry.size()).toEqual(oldRegistrySize - deletedIds.length);
        });
      });

      describe('Deep tree of conditions', () => {
        Given(() => {
          removeId = andAllDef.id;
        });
        Then(() => {
          expect(deletedIds).toEqual([
            colorBlueDef.id,
            orColorsDef.id,
            andAllDef.id
          ]);
          const registry = componentUnderTest.registry;
          expect(registry.fetch(colorBlueDef.id)).toBeNull();
          expect(registry.fetch(orColorsDef.id)).toBeNull();
          expect(registry.fetch(andAllDef.id)).toBeNull();
          expect(registry.size()).toEqual(oldRegistrySize - deletedIds.length);
        });
      });
    });
  });
});
