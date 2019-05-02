/**
 * This class should provide unique ids.
 */
export class IdGenerator {
  static buildDefault(): IdGenerator {
    return new IdGenerator(1);
  }

  static buildFromLastId(lastId: string): IdGenerator {
    const parsedInt = (parseInt(lastId, 10) + 1) || 1;
    return new IdGenerator(parsedInt);
  }

  private constructor(private _currentValue: number) {}

  nextId(): string {
    return '' + this._currentValue++;
  }

  reset() {
    this._currentValue = 1;
  }
}
