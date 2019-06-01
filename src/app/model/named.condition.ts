export interface ReferenceMap { [condition_id: string]: true; }
export interface Conditions { [s: string]: NamedCondition; }
/**
 * NamedCondition extends a conditionDef, by knowing which other
 * conditions refer to the conditonDef by name.
 * - the name of the conditionDef
 * - the condition id of the conditionDef
 * - a smart-pointer-like reference-map-plus-count
 *
 * Note that:
 * - Each NamedCondition instance holds the condition ids of the conditions
 *   that refer to the named condition directly. (Thus they could be other
 *   named or unnamed conditions). Complex AND's and OR's should enforce
 *   no double-referencing of the same NamedCondition.
 */

export function equalsConditions(a: Conditions, b: Conditions) {
  const equalKeys = JSON.stringify(Object.keys(a)) === JSON.stringify(Object.keys(b));
  if (equalKeys) {
    const foundDiscrepancy = Object.keys(a).find(key => NamedCondition.toString(a[key]) !== NamedCondition.toString(b[key]));
    if (foundDiscrepancy) {
      return false;
    } else {
      return true;
    }
  }
  return false;
}

export class NamedCondition {
  constructor(private _name: string, private _conditionId: string) {}

  get name(): string {
    return this._name;
  }

  get conditionId(): string {
    return this._conditionId;
  }

  get references(): ReferenceMap {
    return {...this._references};
  }

  private _references: ReferenceMap = {};
  private _referenceCount = 0;

  static fromString(serializedCondition: string): NamedCondition {
    const parsed = JSON.parse(serializedCondition);
    const namedCondition = new NamedCondition(parsed.name, parsed.conditionId);
    parsed.references.forEach(reference => namedCondition.addReference(reference));
    return namedCondition;
  }

  static toString(namedConditon: NamedCondition): string {
    return JSON.stringify({
      name: namedConditon._name,
      conditionId: namedConditon._conditionId,
      references: Object.keys(namedConditon._references)
    });
  }

  addReference(conditionId: string) {
    if (this._references.hasOwnProperty(conditionId)) {
      const errMsg = 'Condition ' + this._conditionId + ' (' + this._name + ') is already referenced by ' + conditionId;
      throw new Error(errMsg);
    } else {
      this._referenceCount++;
      this._references[conditionId] = true;
    }
  }

  hasReference(conditionId: string) {
    return this._references.hasOwnProperty(conditionId);
  }

  removeReference(conditionId: string): boolean {
    if (!this._references.hasOwnProperty(conditionId)) {
      console.error('Condition ' + this._conditionId + ' (' + this._name + ') does not have reference to ' + conditionId);
      return false;
    } else {
      delete this._references[conditionId];
      this._referenceCount--;
      return true;
    }
  }

  canRemove(): boolean {
    return this._referenceCount === 0;
  }
}

