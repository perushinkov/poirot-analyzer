import {AllocationExecutor} from './allocation.executor';
import {ConditionsRegistry} from './conditions.registry';
import {AllocationDefinition, DataSet, GrammarTypes as GT} from './defs';
import {ConditionsBuilder} from './conditions.builder';
import {IdGenerator} from './id.generator';

describe('AllocationExecutor', () => {
  let componentUnderTest: AllocationExecutor;
  let testRegistry: ConditionsRegistry; // TODO: Can be mocked!
  let sampleDataSet: DataSet;
  let testAllocation: AllocationDefinition;
  let conditions: any;
  let actualAllocationOutput: any/*AllocationOutput*/;
  let expectedAllocationOutput: any/*AllocationOutput*/;
  Given(() => {
    sampleDataSet = {
      name: 'Employees',
      grammar: {
        fields: ['name', 'country', 'salary', 'reliability'],
        types: [GT.t_string, GT.t_string, GT.t_number, GT.t_number]
      },
      positions: [
        {name: 'Joe',     country: 'UK', salary: 170, reliability: 0.8},
        {name: 'Elena',   country: 'UK', salary: 230, reliability: 0.8},
        {name: 'Marta',   country: 'BG', salary: 140, reliability: 0.35},
        {name: 'Diana',   country: 'BG', salary: 210, reliability: 0.46},
        {name: 'John',    country: 'US', salary: 130, reliability: 0.15},
        {name: 'Stefan',  country: 'GR', salary: 190, reliability: 0.71}
      ]
    };
    testRegistry = new ConditionsRegistry();
    const builder = new ConditionsBuilder(new IdGenerator(), testRegistry);
    conditions = {};
    conditions.is_BG = builder.buildIdentity('country', 'BG').id;
    conditions.is_US = builder.buildIdentity('country', 'US').id;
    conditions.is_not_BG = builder.buildNot(conditions.is_BG);
    conditions.is_betw_Joe_Marta = builder.buildBetween('name', {range: ['Joe', 'Marta'], included: [0, 1]});
    conditions.is_gt_half = builder.buildComparison('reliability', {operator: '>', value: 0.5});

    componentUnderTest = new AllocationExecutor(testRegistry);
  });

  describe('Undefined allocation definition', () => {
    When(() => {
      testAllocation = undefined;
      actualAllocationOutput = componentUnderTest.interpret(testAllocation, sampleDataSet);
    });
    Then(() => {
      expectedAllocationOutput = {
        name: 'Error',
        _classified: [],
        _unclassified: [],
        children: []
      };
      expect(actualAllocationOutput).toEqual(expectedAllocationOutput);
    });
  });

  describe('Empty allocation definition should classify all at root', () => {
    When(() => {
      testAllocation = {id: 'root', children: []};
      actualAllocationOutput = componentUnderTest.interpret(testAllocation, sampleDataSet);
    });
    Then(() => {
      expectedAllocationOutput = {
        name: 'Wrapper',
        _classified: sampleDataSet.positions,
        _unclassified: [],
        children: []
      };
      expect(actualAllocationOutput).toEqual(expectedAllocationOutput);
    });
  });

  describe('Allocation def with simple conditions at 1st level', () => {
    When(() => {
      testAllocation = {
        id: 'root',
        children: [
          {id: conditions.is_BG, children: []},
          {id: conditions.is_US, children: []}
        ]
      };
      actualAllocationOutput = componentUnderTest.interpret(testAllocation, sampleDataSet);
    });
    Then(() => {
      expectedAllocationOutput = {
        name: 'Wrapper',
        _classified: [
          sampleDataSet.positions[0],
          sampleDataSet.positions[1],
          sampleDataSet.positions[5]
        ],
        _unclassified: [],
        children: [
          {
            name: 'country is BG',
            _classified: [
              sampleDataSet.positions[2],
              sampleDataSet.positions[3]
            ],
            _unclassified: [],
            chidren: [],
          },
          {
            name: 'country is US',
            _classified: [
              sampleDataSet.positions[4]
            ],
            _unclassified: [],
            chidren: [],
          }
        ]
      };
      expect(actualAllocationOutput).toEqual(expectedAllocationOutput);
      // TODO: Fix _unclassified cleanup in allocation.executor
    });
  });
});
