/**
 * This class should provide unique ids.
 */
export class IdGenerator {
  private _currentValue = 1;

  nextId(): string {
    return JSON.stringify(this._currentValue++);
  }

  reset() {
    this._currentValue = 1;
  }
}
