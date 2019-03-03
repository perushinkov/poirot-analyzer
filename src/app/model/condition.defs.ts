export interface SingleDef {id;  name;  type;  property;  value; }

export interface MultiDef {id; name; type; property; values; }

export interface MonoCompositeDef {id; name; type; value; }

export interface MultiCompositeDef { id; name; type; values; }

export type ConditionDef = SingleDef | MultiDef | MonoCompositeDef | MultiCompositeDef;

export const ConditionTypes = {
  multi: {values: 1, enums: 1, ranges: 1},
  single: {between: 1, identity: 1, comparison: 1},
  composite: {not: 1, and: 1, or: 1, bool: 1},
  internal: {reference: 1}
};
