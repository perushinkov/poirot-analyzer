export interface SingleDef {id: string;  name: string;  type: 'between'|'identity'|'comparison';  property;  value; }

export interface MultiDef {id: string; name: string; type: 'values'|'enums'|'ranges'; property; values: any[]; }

export interface MonoCompositeDef {id: string; name: string; type: 'not'|'bool'|'reference'; value; }

export interface MultiCompositeDef {id: string; name: string; type: 'and'|'or'; values: any[]; }

export type ConditionDef = SingleDef | MultiDef | MonoCompositeDef | MultiCompositeDef;

export const ConditionTypes = {
  multi: {values: 1, enums: 1, ranges: 1},
  single: {between: 1, identity: 1, comparison: 1},
  composite: {not: 1, and: 1, or: 1, bool: 1},
  internal: {reference: 1}
};
