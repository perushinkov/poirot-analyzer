import {Workspace} from './workspace';
import {GrammarTypes as GT} from './defs';

describe('Workspace', () => {
  let serializedWorkspace, deserializedWorkspace, reserializedWorkspace;
  Given(() => {
    serializedWorkspace = JSON.stringify({
      title: ' someTitle',
      positionSets: [{
        name: 'Some data set',
        positions: [
          {name: 'Joe', country: 'UK', salary: 170, reliability: 0.8},
          {name: 'Elena', country: 'UK', salary: 230, reliability: 0.8}
        ]
      }],
      grammar: {
        fields: ['name', 'country', 'salary', 'reliability'],
        types: [GT.t_string, GT.t_string, GT.t_number, GT.t_number]
      },
      registry: {
        '1': {id: '1', name: '', property: 'default', type: 'identity', value: 'value'},
        '2': {id: '2', name: '', property: 'default', type: 'identity', value: 'value'},
        '3': {id: '3', name: 'named', property: 'default', type: 'identity', value: 'value'}
      },
      conditions: {
        ze_condition: {name: 'ze_condition', conditionId: '1', references: ['2']}
      },
      allocations: [],
      version: {
        MAJOR: 0,
        MINOR: 0
      }
    });
  });
  When(() => {
    deserializedWorkspace = Workspace.fromString(serializedWorkspace);
    reserializedWorkspace = Workspace.toString(deserializedWorkspace);
  });
  Then(() => {
    expect(JSON.parse(serializedWorkspace)).toEqual(JSON.parse(reserializedWorkspace));
  });
});
