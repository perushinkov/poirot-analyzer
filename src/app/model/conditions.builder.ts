import {MonoCompositeDef, MultiCompositeDef, MultiDef, SingleDef} from './defs';
import {ConditionsRegistry} from './conditions.registry';
import {IdGenerator} from './id.generator';

/**
 * Contains constructors for each type of condition that are accessible by their type tree.
 */

export class ConditionsBuilder {
  constructor(private _idGenerator: IdGenerator,
              private _registry: ConditionsRegistry) {}

  get registry(): ConditionsRegistry {
    return this._registry;
  }

  buildValues(property: string, values: any[], name: string): MultiDef {
    const def: MultiDef = {
      id: this._idGenerator.nextId(),
      name: name || '',
      type: 'values',
      property: property,
      values: values
    };
    this._registry.register(def);
    return def;
  }

  buildEnums(property: string, values: any[][], name: string): MultiDef {
    const def: MultiDef = {
      id: this._idGenerator.nextId(),
      name: name || '',
      type: 'enums',
      property: property,
      values: values
    };
    this._registry.register(def);
    return def;
  }

  buildRanges(property: string, values: [any, any], name: string): MultiDef {
    const def: MultiDef = {
      id: this._idGenerator.nextId(),
      name: name || '',
      type: 'ranges',
      property: property,
      values: values
    };
    this._registry.register(def);
    return def;
  }

  buildBetween(property: string, value: { range: [any, any], included: [0 | 1, 0 | 1] }, name?: string): SingleDef {
    const def: SingleDef = {
      id: this._idGenerator.nextId(),
      name: name || '',
      type: 'between',
      property: property,
      value: value
    };
    this._registry.register(def);
    return def;
  }

  buildIdentity(property: string, value: any, name?: string): SingleDef {
    const def: SingleDef = {
      id: this._idGenerator.nextId(),
      name: name || '',
      type: 'identity',
      property: property,
      value: value
    };
    this._registry.register(def);
    return def;
  }

  buildComparison(property: string, value: { operator: '>' | '<' | '>=' | '<=', value: any }, name?: string): SingleDef {
    const def: SingleDef = {
      id: this._idGenerator.nextId(),
      name: name || '',
      type: 'comparison',
      property: property,
      value: value
    };
    this._registry.register(def);
    return def;
  }

  buildNot(value: string, name?: string): MonoCompositeDef {
    const def: MonoCompositeDef = {
      id: this._idGenerator.nextId(),
      name: name || 'Not [' + value + ']',
      type: 'not',
      value: value
    };
    this._registry.register(def);
    return def;
  }

  buildAnd(values: string[], name?: string): MultiCompositeDef {
    const def: MultiCompositeDef = {
      id: this._idGenerator.nextId(),
      name: name,
      type: 'and',
      values: values
    };
    this._registry.register(def);
    return def;
  }

  buildOr(values: string[], name?: string): MultiCompositeDef {
    const def: MultiCompositeDef = {
      id: this._idGenerator.nextId(),
      name: name,
      type: 'or',
      values: values
    };
    this._registry.register(def);
    return def;
  }

  buildBool(value: string, name?: string): MonoCompositeDef {
    const def: MonoCompositeDef = {
      id: this._idGenerator.nextId(),
      name: name,
      type: 'bool',
      value: value
    };
    this._registry.register(def);
    return def;
  }

  buildReference(value: string): MonoCompositeDef {
    const def: MonoCompositeDef = {
      id: this._idGenerator.nextId(),
      name: value,
      type: 'reference',
      value: value
    };
    this._registry.register(def);
    return def;
  }
}
