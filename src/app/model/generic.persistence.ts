import {AbstractFileStorage} from './abstract.file.storage';
import {Serializer} from './serializer.interface';

const validIdentifier = /^\w+$/;
export class Persistence<Entity> {
  constructor(private _storage: AbstractFileStorage, private _serializer: Serializer<Entity>) {}

  save(entity: Entity): boolean {
    if (!entity) {
      return false;
    }
    const saver = this._serializer;
    const file = saver.toStr(entity);
    const prefix = saver.getPrefix();
    const fileName = prefix + saver.getIdentifier(entity);
    if (!this._storage.exists(fileName)) {
      return this._storage.save(fileName, file);
    }
    return false;
  }

  load(identifier: string): Entity {
    const loader = this._serializer;
    const fileName = loader.getPrefix() + identifier;

    if (!identifier
      || !validIdentifier.test(fileName)
      || this._storage.exists(fileName)) {
      return null;
    }
    const file = this._storage.load(fileName);
    if (file === null) {
      return null;
    }
    return loader.fromStr(file);
  }

  listDirectory(): string[] {
    const paths = this._storage.listPaths();
    return !paths ? null : paths.filter(path => path.startsWith(this._serializer.getPrefix()));
  }
}
