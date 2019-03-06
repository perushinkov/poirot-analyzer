import {EXPECTED_TODO_VALUE} from '../../../polyfills';

describe('ConditionsHelpInfoUtils', () => {
  describe('METHOD: generate', () => {
    Then(() => {
      expect('NOT DONE').toEqual(EXPECTED_TODO_VALUE);
    });
  });
  describe('METHOD: generateText', () => {
    Then(() => {
      expect('NOT DONE').toEqual(EXPECTED_TODO_VALUE);
    });
  });
});
