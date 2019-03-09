export interface ReferenceMap { [condition_id: string]: true; }
/**
 * NamedCondition extends a conditionDef, by knowing which other
 * conditions refer to the conditonDef by name.
 * - the name of the conditionDef
 * - the condition id of the conditionDef
 * - a smart-pointer-like reference-map-plus-count
 */
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
      console.error('Condition ' + this._conditionId + ' (' + this._name + ') is already referenced by ' + conditionId);
    } else {
      this._referenceCount++;
      this._references[conditionId] = true;
    }
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

