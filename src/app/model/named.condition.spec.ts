import {NamedCondition} from './named.condition';

describe('NamedCondition', () => {
  let componentUnderTest: NamedCondition;
  let actual;

  Given(() => {
    componentUnderTest = new NamedCondition('name', 17);
  });

  describe('After init should be removable', () => {
    Then(() => {
      expect(componentUnderTest.canRemove()).toBeTruthy();
    });
  });

  describe('If references are added', () => {
    When(() => {
      componentUnderTest.addReference(111);
    });

    describe('Component should not be removable', () => {
      Then(() => {
        expect(componentUnderTest.canRemove()).toBeFalsy();
      });
    });

    describe('References should be removable', () => {
      When(() => {
        actual = componentUnderTest.removeReference(111);
      });
      Then(() => {
        expect(actual).toBeTruthy();
      });
    });

    describe('and then removed', () => {
      When(() => {
        componentUnderTest.removeReference(111);
        actual = componentUnderTest.canRemove();
      });
      Then(() => {
        expect(actual).toBeTruthy();
      });
    });
  });
});
