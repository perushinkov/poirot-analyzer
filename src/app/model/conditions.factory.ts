import {MonoCompositeDef, MultiCompositeDef, MultiDef, SingleDef} from './condition.defs';

/**
 * Contains constructors for each type of condition that are accessible by their type tree.
 */

export class ConditionsFactory {
  constructor() {}

  multi = {
    values: function(property: string, values: any[], name: string): MultiDef {
      return {
        id: 'unassigned',
        name: name || '',
        type: 'values',
        property: property,
        values: values
      };
    },
    enums: function(property: string, values: any[][], name: string): MultiDef {
      return {
        id: 'unassigned',
        name: name || '',
        type: 'enums',
        property: property,
        values: values
      };
    },
    ranges: function(property: string, values: [any, any], name: string): MultiDef {
      return {
        id: 'unassigned',
        name: name || '',
        type: 'ranges',
        property: property,
        values: values
      };
    }
  };
  single = {
    //
    between: function(property: string, value: {range: [any, any], included: [0|1, 0|1]}, name: string): SingleDef {
      return {
        id: 'unassigned',
        name: name || '',
        type: 'between',
        property: property,
        value: value
      };
    },
    identity: function(property: string, value: any, name: string): SingleDef {
      return {
        id: 'unassigned',
        name: name || '',
        type: 'identity',
        property: property,
        value: value
      };
    },
    comparison: function(property: string, value: {operator: '>'|'<'|'>='|'<=', value: any}, name: string): SingleDef {
      return {
        id: 'unassigned',
        name: name || '',
        type: 'comparison',
        property: property,
        value: value
      };
    }
  };
  composite = {
    not: function (value: string, name: string): MonoCompositeDef {
      return {
        id: 'unassigned',
        name: name || 'Not [' + value + ']',
        type: 'not',
        value: value
      };
    },
    and: function (values: string[], name: string): MultiCompositeDef {
      return {
        id: 'unassigned',
        name: name,
        type: 'and',
        values: values
      };
    },
    or: function (values: string[], name: string): MultiCompositeDef {
      return {
        id: 'unassigned',
        name: name,
        type: 'or',
        values: values
      };
    },
    bool: function (value: string, name: string): MonoCompositeDef {
      return {
        id: 'unassigned',
        name: name,
        type: 'bool',
        value: value
      };
    }
  };
  internal = {
    reference: function (value: string): MonoCompositeDef {
      return {
        id: 'unassigned',
        name: value,
        type: 'reference',
        value: value
      };
    }
  };
}
