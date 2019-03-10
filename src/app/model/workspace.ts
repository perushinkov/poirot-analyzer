import {DataSet, Grammar} from './defs';
import {ConditionsRegistry} from './conditions.registry';
import {NamedCondition} from './named.condition';
import {Serializer} from './serializer.interface';

export interface Conditions { [s: string]: NamedCondition; }

const SerializationVersion = {
  MAJOR: 0,
  MINOR: 0
};
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
    private _allocations: Array<any>
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

  get allocations(): Array<any> {
    return this._allocations;
  }
}

export class WorkspaceSerializer implements Serializer<Workspace> {
  toStr(workspace: Workspace): string {
    return JSON.stringify({
      title: workspace.title,
      positionSets: workspace.positionSets,
      grammar: workspace.grammar,
      registry: workspace.registry,
      conditions: workspace.conditions,
      allocations: workspace.allocations,
      version: SerializationVersion
    });
  }

  fromStr(workspaceString: string): Workspace {
    const parsed = JSON.parse(workspaceString);
    if (!parsed.version
      || !parsed.positionSets
      || !parsed.grammar
      || !parsed.registry
      || !parsed.conditions
      || !parsed.allocations) {
      return null;
    }
    if (parsed.version.MAJOR > SerializationVersion.MAJOR) {
      console.error('Incompatible version found in saved workspace.');
      // TODO: Make a general error/warning/info notification ui element
      return null;
    }
    return new Workspace(parsed.title, parsed.positionSets, parsed.grammar, parsed.registry, parsed.conditions, parsed.allocations);
  }

  getIdentifier(entity: Workspace): string {
    return entity.title;
  }

  getPrefix(): string {
    return 'workspace_';
  }
}
