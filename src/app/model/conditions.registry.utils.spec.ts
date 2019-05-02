import {ConditionsRegistryUtils, ConditionsRegistryUtils as Utils} from './conditions.registry.utils';
import {ConditionsRegistry} from './conditions.registry';
import {MonoCompositeDef, MultiCompositeDef, SingleDef} from './defs';
import {EXPECTED_TODO_VALUE} from '../../polyfills';
import {SAMPLES} from './test-data/workspace.tdata';
import {Conditions, NamedCondition} from './named.condition';

describe('ConditionsRegistryUtils', () => {
  let testRegistry: ConditionsRegistry;

  let actualValue;

  let singleDef1: SingleDef;
  let singleDef2: SingleDef;
  let singleDefNamed: SingleDef;
  let boolDef: MonoCompositeDef;
  let notDef: MonoCompositeDef;
  let orDef: MultiCompositeDef;
  let notNamedDef: MonoCompositeDef;
  let orDef2: MultiCompositeDef;
  let unfinishedNot: MonoCompositeDef;
  let unfinishedOr: MultiCompositeDef;

  Given(() => {
    singleDef1 = {id: '1', name: '', property: 'default', type: 'identity', value: 'value'};
    singleDef2 = {id: '2', name: '', property: 'default', type: 'identity', value: 'value'};
    singleDefNamed = {id: '3', name: 'named', property: 'default', type: 'identity', value: 'value'};
    boolDef = {id: '4', name: '', type: 'bool', value: true};
    notDef = {id: '5', name: '', type: 'not', value: '1'};
    orDef = {id: '6', name: 'or', type: 'or', values: ['5', '2']};
    notNamedDef = {id: '7', name: 'namedNot', type: 'not', value: '1'};
    orDef2 = {id: '8', name: 'or2', type: 'or', values: ['7', '2']};
    unfinishedNot = {id: '9', name: '', type: 'not', value: null};
    unfinishedOr = {id: '10', name: 'unfinishedOr', type: 'or', values: ['9', '1', null]};
  });

  describe('METHOD: getChildrenArray tests', () => {
    When(() => {
      testRegistry = new ConditionsRegistry();
      testRegistry.register(singleDef1);
      testRegistry.register(singleDef2);
      testRegistry.register(singleDefNamed);
      testRegistry.register(boolDef);
      testRegistry.register(notDef);
      testRegistry.register(orDef);
      testRegistry.register(notNamedDef);
      testRegistry.register(orDef2);
      testRegistry.register(unfinishedNot);
      testRegistry.register(unfinishedOr);
    });

    describe('unnamed single definition should be its own children tree', () => {
      When(() => {
        actualValue = Utils.getChildrenArray(testRegistry, '1', true);
      });
      Then(() => {
        expect(actualValue).toEqual([singleDef1]);
      });
    });

    describe('named single definition should be its own children tree', () => {
      When(() => {
        actualValue = Utils.getChildrenArray(testRegistry, '3', true);
      });
      Then(() => {
        expect(actualValue).toEqual([singleDefNamed]);
      });
    });

    describe('bool definition should be its own children tree', () => {
      When(() => {
        actualValue = Utils.getChildrenArray(testRegistry, '4', true);
      });
      Then(() => {
        expect(actualValue).toEqual([boolDef]);
      });
    });

    describe('multi definition with no named nodes should be flattened via a DFS walk', () => {
      When(() => {
        actualValue = Utils.getChildrenArray(testRegistry, '6', true);
      });
      Then(() => {
        expect(actualValue).toEqual([singleDef1, notDef, singleDef2, orDef]);
      });
    });

    describe('multi definition with named nodes and followReferences(true) should be flattened via a DFS walk', () => {
      When(() => {
        actualValue = Utils.getChildrenArray(testRegistry, '8', true);
      });
      Then(() => {
        expect(actualValue).toEqual([singleDef1, notNamedDef, singleDef2, orDef2]);
      });
    });

    describe('multi def with named nodes should not expore named nodes', () => {
      When(() => {
        actualValue = Utils.getChildrenArray(testRegistry, '8', false);
      });
      Then(() => {
        expect(actualValue).toEqual([notNamedDef, singleDef2, orDef2]);
      });
    });

    describe('Unfinished multi should contain nulls where definition is in progress', () => {
      When(() => {
        actualValue = Utils.getChildrenArray(testRegistry, '10', true);
      });
      Then(() => {
        expect(actualValue).toEqual([null, unfinishedNot, singleDef1, null, unfinishedOr]);
      });
    });

    describe('Bad id def should return a [null]', () => {
      When(() => {
        actualValue = Utils.getChildrenArray(testRegistry, 'bad id', true);
      });
      Then(() => {
        expect(actualValue).toEqual([null]);
      });
    });

  });

  describe('METHOD: containsWipNodes', () => {
    Then(() => {
      expect('NOT DONE').toEqual(EXPECTED_TODO_VALUE);
    });
  });

  describe('METHOD: getName', () => {
    Then(() => {
      expect('NOT DONE').toEqual(EXPECTED_TODO_VALUE);
    });
  });

  describe('METHOD: test serialization', () => {
    let serializedRegistry: string;
    let reserializedRegistry: string;
    let deserializedDefs;
    Given(() => {
      serializedRegistry = JSON.stringify({
        '1': singleDef1,
        '8': orDef2,
        '10': unfinishedOr
      });
    });

    When(() => {
      testRegistry = ConditionsRegistry.fromString(serializedRegistry);
      deserializedDefs = [
        testRegistry.fetch('1'),
        testRegistry.fetch('8'),
        testRegistry.fetch('10')
      ];
      reserializedRegistry = ConditionsRegistry.toString(testRegistry);
    });


    Then(() => {
      expect(serializedRegistry).toEqual(reserializedRegistry);
      expect(deserializedDefs).toEqual([singleDef1, orDef2, unfinishedOr]);
    });
  });

  describe('METHOD: buildNamedConditions', () => {
    let namedConditions: Conditions;
    Given(() => {
      testRegistry = SAMPLES.registry();
    });

    describe('nothrow', () => {
      When(() => {
        namedConditions = ConditionsRegistryUtils.buildNamedConditions(testRegistry);
      });

      describe('When no referenced condition is named', () => {
        Then(() => {
          expect(namedConditions).toEqual({
            is_US: new NamedCondition('is_US', '2'),
            is_not_BG: new NamedCondition('is_not_BG', '3'),
            between_joe_and_marta: new NamedCondition('between_joe_and_marta', '4'),
            reliability_above_half: new NamedCondition('reliability_above_half', '5'),
            cake_not_is_true: new NamedCondition('cake_not_is_true', '7')
          });
        });
      });

      describe('When named conditions are directly referenced', () => {
        Given(() => {
          testRegistry.fetch('1').name = 'is_BG';
        });
        Then(() => {
          const isBGDef = new NamedCondition('is_BG', '1');
          isBGDef.addReference('3');
          expect(namedConditions).toEqual({
            is_BG: isBGDef,
            is_US: new NamedCondition('is_US', '2'),
            is_not_BG: new NamedCondition('is_not_BG', '3'),
            between_joe_and_marta: new NamedCondition('between_joe_and_marta', '4'),
            reliability_above_half: new NamedCondition('reliability_above_half', '5'),
            cake_not_is_true: new NamedCondition('cake_not_is_true', '7')
          });
        });
      });

      describe('WHen named conditions are indirectly referenced', () => {
        Given(() => {
          testRegistry.fetch('1').name = 'is_BG';
          testRegistry.fetch('6').name = 'truth';
          testRegistry.fetch('7').name = '';
          // TODO: Add test where 1 isn't modified, and so isn't 6... so this case is illegal,
          //       because it breaks the invariant that no unnamed condition should be referenced
          //       more than once
          testRegistry.register({id: '8', type: 'and', name: 'andy', values: ['7', '1']});
        });
        Then(() => {
          const isBGDef = new NamedCondition('is_BG', '1');
          isBGDef.addReference('3');
          isBGDef.addReference('8');
          const truthDef = new NamedCondition('truth', '6');
          truthDef.addReference('7');
          expect(namedConditions).toEqual({
            is_BG: isBGDef,
            is_US: new NamedCondition('is_US', '2'),
            is_not_BG: new NamedCondition('is_not_BG', '3'),
            between_joe_and_marta: new NamedCondition('between_joe_and_marta', '4'),
            reliability_above_half: new NamedCondition('reliability_above_half', '5'),
            truth: truthDef,
            andy: new NamedCondition('andy', '8')
          });
        });
      });
    });

    describe('throw', () => {
      let throwCall;
      Given(() => {
        throwCall = () => ConditionsRegistryUtils.buildNamedConditions(testRegistry);
      });

      describe('when conditions with same names', () => {
        Given(() => {
          testRegistry.fetch('1').name = 'same name';
          testRegistry.fetch('7').name = 'same name';
        });
        Then(() => {
          expect(throwCall).toThrowError('Condition defs with the same names found!');
        });
      });
    });
  });
});
