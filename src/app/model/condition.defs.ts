export interface SingleDef {id;  name;  type;  property;  value; }

export interface MultiDef {id; name; type; property; values; }

export interface MonoCompositeDef {id; name; type; value; }

export interface MultiCompositeDef { id; name; type; values; }

export type ConditionDef = SingleDef | MultiDef | MonoCompositeDef | MultiCompositeDef;
