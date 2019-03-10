export interface Serializer<Entity> {
  toStr(entity: Entity): string;
  fromStr(serializedEntity: string): Entity;
  getIdentifier(entity: Entity): string;
  getPrefix(): string;
}
