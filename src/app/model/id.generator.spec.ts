import {IdGenerator} from './id.generator';

describe('IdGenerator test', () => {
  let actualValue, expectedValue;
  let componentUnderTest: IdGenerator;
  Given(() => {
    componentUnderTest = new IdGenerator();
  });

  describe('METHOD: nextId', () => {

    describe('Expect nextId to return something', () => {
      When(() => {
        actualValue = componentUnderTest.nextId();
      });

      Then(() => {
        expect(actualValue).toBeDefined();
      });
    });

    describe('Expect nextId to return different values', () => {
      When(() => {
        actualValue = [componentUnderTest.nextId(), componentUnderTest.nextId()];
      });

      Then(() => {
        expect(actualValue[0]).not.toEqual(actualValue[1]);
      });
    });
  });

  describe('METHOD: reset', () => {
    When(() => {
      expectedValue = [componentUnderTest.nextId(), componentUnderTest.nextId()];
      componentUnderTest.reset();
      actualValue = [componentUnderTest.nextId(), componentUnderTest.nextId()];
    });

    Then(() => {
      expect(actualValue).toEqual(expectedValue);
    });
  });
});
