import {ConditionsFactory} from './conditions.factory';

describe('ConditionsFactory', () => {
  let componentUnderTest: ConditionsFactory;
  let actualValues, expectedValues;
  Given(() => {
    componentUnderTest = new ConditionsFactory();
  });

  // For now this method serves only as a documentation
  describe('DOCUMENTATION', () => {
    When(() => {
      actualValues = {
        'single.identity': componentUnderTest.single.identity('nationality', 'BG', 'A fellow countryman of mine!'),
        'single.comparison': componentUnderTest.single.comparison('salary', {operator: '>', value: 10000}, 'An okay salary... I guess'),
        'single.between': componentUnderTest.single.between('age', {range: [18, 65], included: [0, 1]}, '18 -> 65'),
        'multi.values': componentUnderTest.multi.values('name', ['Annie', 'Joe'], 'split by Annie and Joe'),
        'multi.enums': componentUnderTest.multi.enums('numbers', [[1, 3, 5], [2, 4]], 'Odd vs even'),
        'multi.ranges': componentUnderTest.multi.ranges('age', [18, 65], 'okay age for a driver'),
        'composite.and': componentUnderTest.composite.and(['id1', 'id2', 'id3'], 'The good, the bad and the ugly!'),
        'composite.or': componentUnderTest.composite.or(['id1', 'id2', 'id3'], 'The good, the bad or the ugly!'),
        'composite.not': componentUnderTest.composite.not('id1', 'Not the good'),
        'internal.reference': componentUnderTest.internal.reference('Name of condition')
      };
    });
    Then(() => {
      expectedValues = {
        'single.identity': {id: 'unassigned', name: 'A fellow countryman of mine!', type: 'identity', property: 'nationality', value: 'BG'},
        'single.comparison': {
          id: 'unassigned', name: 'An okay salary... I guess', type: 'comparison', property: 'salary', value: {operator: '>', value: 10000}
        },
        'single.between': {
          id: 'unassigned',
          name: '18 -> 65',
          type: 'between',
          property: 'age',
          value: {range: [18, 65], included: [0, 1]}
        },
        'multi.values': {id: 'unassigned', name: 'split by Annie and Joe', type: 'values', property: 'name', values: ['Annie', 'Joe']},
        'multi.enums': {id: 'unassigned', name: 'Odd vs even', type: 'enums', property: 'numbers', values: [[1, 3, 5], [2, 4]]},
        'multi.ranges': {id: 'unassigned', name: 'okay age for a driver', type: 'ranges', property: 'age', values: [18, 65]},
        'composite.and': {id: 'unassigned', name: 'The good, the bad and the ugly!', type: 'and', values: ['id1', 'id2', 'id3']},
        'composite.or': {id: 'unassigned', name: 'The good, the bad or the ugly!', type: 'or', values: ['id1', 'id2', 'id3']},
        'composite.not': {id: 'unassigned', name: 'Not the good', type: 'not', value: 'id1'},
        'internal.reference': {id: 'unassigned', name: 'Name of condition', type: 'reference', value: 'Name of condition'}
      };

      expect(actualValues).toEqual(expectedValues);
    });
  });
});


