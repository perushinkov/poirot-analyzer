export interface SingleDef {id: string;  name: string;  type: 'between'|'identity'|'comparison';  property;  value; }

export interface MultiDef {id: string; name: string; type: 'values'|'enums'|'ranges'; property; values: any[]; }

export interface MonoCompositeDef {id: string; name: string; type: 'not'|'bool'|'reference'; value; }

export interface MultiCompositeDef {id: string; name: string; type: 'and'|'or'; values: any[]; }

export type CompositeDef = MonoCompositeDef | MultiCompositeDef;

export type ConditionDef = SingleDef | MultiDef | MonoCompositeDef | MultiCompositeDef;

export const ConditionTypes = {
  multi: {values: 1, enums: 1, ranges: 1},
  single: {between: 1, identity: 1, comparison: 1},
  composite: {not: 1, and: 1, or: 1, bool: 1},
  internal: {reference: 1}
};

export interface AllocationDefinition {
  id: string;
  children: AllocationDefinition[];
}

export interface AllocationOutput {
  unclassified: any[];
  classified: any[];
  folderName: string;
  children: AllocationOutput[];
}
export enum GrammarTypes {
  t_string,
  t_number
}

export interface Grammar {
  types: Array<GrammarTypes>;
  fields: Array<string>;
}

export interface DataSet {
  name: string;
  grammar: Grammar;
  positions: any[];
}

/**
  One creates an AllocationDefinition by createing a folder-like structure of ConditionDefs.
  (The AllocationDefinition just holds ids to those).
  Then you apply the AllocationDefinition to a DataSet in order to get the AllocationOutput.
  Then, if needed. A Report can be generated from the AllocationOutput (optionally by using
  additional aggregations/sorts/counts/column reorder etc.
*/

export interface Report {
  todo: any;
}

