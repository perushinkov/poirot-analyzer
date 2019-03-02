/**
 * This class should provide unique ids.
 */
export class IdGenerator {
  private _currentValue = 1;

  nextId(): number {
    return this._currentValue++;
  }
}
