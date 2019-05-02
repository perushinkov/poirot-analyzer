/**
 * Upon creation conditions will be registered here. This is sort of the condition's repository.
 * Used to be a singleton service. Reworking that.
 */
import {ConditionDef} from './defs';
// TODO: make sure private variables are consistently named. i.e. _camelCase
export class ConditionsRegistry {
  constructor() { }

  private _registry: {[id: string]: ConditionDef} = {};
  private _lastId: string;

  get lastId(): string {
    return this._lastId;
  }

  static fromString(serializedRegistry: string): ConditionsRegistry {
    const registry = new ConditionsRegistry();
    const parsed = JSON.parse(serializedRegistry);
    Object.keys(parsed).forEach(key => registry.register(parsed[key]));
    return registry;
  }

  static toString(registry: ConditionsRegistry): string {
    return JSON.stringify(registry.getShallowCopy());
  }

  register(def: ConditionDef) {
    if (typeof def.id === 'string') {
      this._registry[def.id] = def;
      this._lastId = def.id;
    }
  }

  fetch(id: string): ConditionDef {
    return this._registry[id] || null;
  }

  size() {
    return Object.keys(this._registry).length;
  }

  remove (id: string) {
    delete this._registry[id];
  }

  clear() {
    this._registry = {};
  }

  getShallowCopy() {
    return {...this._registry};
  }
}
