
import {Grammar, GrammarTypes as GT} from '../defs';
import {ConditionsRegistry} from '../conditions.registry';
import {ConditionsBuilder} from '../conditions.builder';
import {ConditionsRegistryUtils} from '../conditions.registry.utils';

/**
 * NOTE (1):
 * The data sample providers below may or may not use functionality that is being tested.
 * Keep in mind that if a method uses a certain functionality A, it should not be used in the unit test for A.
 *
 * NOTE (2):
 * The sample data IS NOT invalid sample data. Invalid sample data is either created from ground zero in the spec files,
 * or created via the modification of valid sample data.
 */

const _makeDataSet = function () {
  return {
    name: 'Employees',
    positions: [
      {name: 'Joe',     country: 'UK', salary: 170, reliability: 0.8},
      {name: 'Elena',   country: 'UK', salary: 230, reliability: 0.8},
      {name: 'Marta',   country: 'BG', salary: 140, reliability: 0.35},
      {name: 'Diana',   country: 'BG', salary: 210, reliability: 0.56},
      {name: 'John',    country: 'US', salary: 130, reliability: 0.15},
      {name: 'Stefan',  country: 'GR', salary: 190, reliability: 0.71}
    ]
  };
};
const _makeGrammar = function (): Grammar {
  // noinspection UnnecessaryLocalVariableJS
  const grammar: Grammar = {
    fields: ['name', 'country', 'salary', 'reliability'],
    types: [GT.t_string, GT.t_string, GT.t_number, GT.t_number]
  };
  return grammar;
};
const _makeRegistry = function () {
  const sampleRegistry = new ConditionsRegistry();
  const builder = ConditionsBuilder.createFromRegistry(sampleRegistry);

  const is_BG = builder.buildIdentity('country', 'BG').id;
  builder.buildIdentity('country', 'US', 'is_US');
  builder.buildNot(is_BG, 'is_not_BG');
  builder.buildBetween('name', {range: ['Joe', 'Marta'], included: [0, 1]}, 'between_joe_and_marta');
  builder.buildComparison('reliability', {operator: '>', value: 0.5}, 'reliability_above_half');
  const is_true = builder.buildBool(true).id;
  builder.buildNot(is_true, 'cake_not_is_true');
  return sampleRegistry;
};

const _makeWorkspaceJSON = function (): any {
  const registry = _makeRegistry();
  const conditions = ConditionsRegistryUtils.buildNamedConditions(registry);
  return {
    title: 'someTitle',
    positionSets: [_makeDataSet()],
    registry: registry,
    conditions: conditions,
    allocations: [],
    version: {
      MAJOR: 0,
      MINOR: 0
    }
  };
};

export const SAMPLES = {
  dataSet: _makeDataSet,
  grammar: _makeGrammar,
  registry: _makeRegistry,
  workspace: _makeWorkspaceJSON
};
