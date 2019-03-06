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
        {name: 'Diana',   country: 'BG', salary: 210, reliability: 0.56},
        {name: 'John',    country: 'US', salary: 130, reliability: 0.15},
        {name: 'Stefan',  country: 'GR', salary: 190, reliability: 0.71}
      ]
    };
    testRegistry = new ConditionsRegistry();
    const builder = new ConditionsBuilder(new IdGenerator(), testRegistry);
    conditions = {};
    conditions.is_BG = builder.buildIdentity('country', 'BG', 'is BG').id;
    conditions.is_US = builder.buildIdentity('country', 'US').id;
    conditions.is_not_BG = builder.buildNot(conditions.is_BG, '').id;
    conditions.is_betw_Joe_Marta = builder.buildBetween('name', {range: ['Joe', 'Marta'], included: [0, 1]}).id;
    conditions.is_gt_half = builder.buildComparison('reliability', {operator: '>', value: 0.5}).id;

    componentUnderTest = new AllocationExecutor(testRegistry);
  });

  When(() => {
    actualAllocationOutput = componentUnderTest.interpret(testAllocation, sampleDataSet);
  });

  describe('Undefined allocation definition', () => {
    Given(() => {
      testAllocation = undefined;
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
    Given(() => {
      testAllocation = {id: 'root', children: []};
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
    Given(() => {
      testAllocation = {
        id: 'root',
        children: [
          {id: conditions.is_BG, children: []},
          {id: conditions.is_US, children: []}
        ]
      };
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
            children: []
          },
          {
            name: 'country is US',
            _classified: [
              sampleDataSet.positions[4]
            ],
            _unclassified: [],
            children: []
          }
        ]
      };
      expect(actualAllocationOutput).toEqual(expectedAllocationOutput);
    });
  });

  describe('Allocation def with nested conditions', () => {
    Given(() => {
      testAllocation = {
        id: 'root',
        children: [
          {
            id: conditions.is_not_BG,
            children: [
              {id: conditions.is_US, children: []}
            ]
          },
          {id: conditions.is_gt_half, children: []}
        ]
      };
    });
    Then(() => {
      expectedAllocationOutput = {
        name: 'Wrapper',
        _classified: [
          sampleDataSet.positions[2]
        ],
        _unclassified: [],
        children: [
          {
            name: 'Not [1]', // TODO: Better default naming for customs?
            _classified: [
              sampleDataSet.positions[0],
              sampleDataSet.positions[1],
              sampleDataSet.positions[5]
            ],
            _unclassified: [],
            children: [
              {
                name: 'country is US',
                _classified: [
                  sampleDataSet.positions[4]
                ],
                _unclassified: [],
                children: []
              }
            ]
          },
          {
            name: 'reliability > 0.5',
            _classified: [
              sampleDataSet.positions[3]
            ],
            _unclassified: [],
            children: []
          }
        ]
      };
      expect(actualAllocationOutput).toEqual(expectedAllocationOutput);
    });
  });
});
