import {DataSet, Grammar} from './defs';
import {ConditionsRegistry} from './conditions.registry';
import {NamedCondition} from './named.condition';

export interface Conditions { [s: string]: NamedCondition; }

/**
 * This class serves more to package data together.
 * Different Workspace operations are managed by other modules
 */
export class Workspace {
  constructor(
    private _title: string,
    private _positionSets: Array<DataSet>,
    private _grammar: Grammar,
    private _registry: ConditionsRegistry,
    private _conditions: Conditions,
    private _formulas: Array<any>
  ) {}

  get title(): string {
    return this._title;
  }

  set title(title: string) {
    this._title = title;
  }

  get positionSets(): Array<DataSet> {
    return this._positionSets;
  }

  get grammar(): Grammar {
    return this._grammar;
  }

  get registry(): ConditionsRegistry {
    return this._registry;
  }

  get conditions(): Conditions {
    return this._conditions;
  }

  get formulas(): Array<any> {
    return this._formulas;
  }
}
