import {ConditionsRegistry} from './conditions.registry';

describe('ConditionsRegistry', () => {
  // let actualValue, expectedValue;
  let componentUnderTest: ConditionsRegistry;
  let badIds, testEntry1, testEntry2;
  Given(() => {
    componentUnderTest = new ConditionsRegistry();
    testEntry1 = {id: '1', name: 'dummy', type: 'dummy', property: 'dummy', value: 'dummy'};
    testEntry2 = {id: '2', name: 'dummy', type: 'dummy', property: 'dummy', value: 'dummy'};
  });

  describe('METHOD: register', () => {
    describe('Expect registering a value with bad id to fail', () => {
      Given(() => {
        badIds = [null, undefined, {}, [], 123, NaN];
      });
      When(() => {
        badIds.forEach(badId => {
          testEntry1.id = badId;
          componentUnderTest.register(testEntry1);
        });
      });
      Then(() => {
        expect(componentUnderTest.size()).toEqual(0);
        expect(componentUnderTest.getShallowCopy()).toEqual({});
      });
    });

    describe('Expect registered value should be fetchable', () => {
      When(() => {
        componentUnderTest.register(testEntry1);
      });
      Then(() => {
        expect(componentUnderTest.fetch(testEntry1.id)).toBe(testEntry1);
      });
    });

    describe('Same id should only be registrable once', () => {
      When(() => {
        componentUnderTest.register(testEntry1);
        componentUnderTest.register(testEntry1);
      });
      Then(() => {
        expect(componentUnderTest.size()).toEqual(1);
      });
    });
  });

  describe('METHOD: clear', () => {
    Given(() => {
      componentUnderTest.register(testEntry1);
      componentUnderTest.register(testEntry2);
    });
    When(() => {
      componentUnderTest.clear();
    });
    Then('Fetching after clear should return null', () => {
      expect(componentUnderTest.fetch('1')).toBeNull();
      expect(componentUnderTest.fetch('2')).toBeNull();
    });
    Then('Registry size should be 0', () => {
      expect(componentUnderTest.size()).toEqual(0);
    });
    Then('Registry shallow copy should be an empty object', () => {
      expect(componentUnderTest.getShallowCopy()).toEqual({});
    });
  });

  describe('METHOD: remove', () => {
    When(() => {
      componentUnderTest.register(testEntry1);
      componentUnderTest.register(testEntry2);
    });

    describe('On removing existing', () => {
      When(() => {
        componentUnderTest.remove('1');
      });
      Then('it should no longer be fetchable', () => {
        expect(componentUnderTest.fetch('1')).toBeNull();
      });
      Then('size should be affected', () => {
        expect(componentUnderTest.size()).toEqual(1);
      });
      Then('shallow copy should not include it', () => {
        expect(componentUnderTest.getShallowCopy()).toEqual({'2': testEntry2});
      });
    });
  });
});
