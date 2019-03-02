/**
 * Upon creation conditions will be registered here. This is sort of the condition's repository.
 * Used to be a singleton service. Reworking that.
 */

export interface EntryWithId {
  id: any;
}
export class ConditionsRegistry {
  constructor() { }

  private registry = {};

  register(def: EntryWithId) {
    if (typeof def.id === 'string') {
      this.registry[def.id] = def;
    }
  }

  fetch(id) {
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
