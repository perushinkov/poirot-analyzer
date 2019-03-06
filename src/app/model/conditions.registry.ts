/**
 * Upon creation conditions will be registered here. This is sort of the condition's repository.
 * Used to be a singleton service. Reworking that.
 */
import {ConditionDef} from './defs';

export class ConditionsRegistry {
  constructor() { }

  private registry: {[id: string]: ConditionDef} = {};

  register(def: ConditionDef) {
    if (typeof def.id === 'string') {
      this.registry[def.id] = def;
    }
  }

  fetch(id): ConditionDef {
    return this.registry[id] || null;
  }

  size() {
    return Object.keys(this.registry).length;
  }

  remove (id) {
    delete this.registry[id];
  }

  clear() {
    this.registry = {};
  }

  getShallowCopy() {
    return {...this.registry};
  }
}
