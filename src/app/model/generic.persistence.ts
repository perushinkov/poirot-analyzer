import {AbstractFileStorage} from './abstract.file.storage';
import {Serializer} from './serializer.interface';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

const validIdentifier = /^\w+$/;
export class Persistence<Entity> {
  constructor(private _storage: AbstractFileStorage, private _serializer: Serializer<Entity>) {}

  save(entity: Entity): Observable<boolean> {
    if (!entity) {
      return of(false);
    }
    const saver = this._serializer;
    const file = saver.toStr(entity);
    const prefix = saver.getPrefix();
    const fileName = prefix + saver.getIdentifier(entity);

    return this._storage.exists(fileName).pipe(switchMap(ifExists => {
      if (!ifExists) {
        return this._storage.save(fileName, file);
      }
      return of(false);
    }));
  }

  load(identifier: string): Observable<Entity> {
    const loader = this._serializer;
    const fileName = loader.getPrefix() + identifier;

    if (!identifier || !validIdentifier.test(fileName)) {
      return of(null);
    }
    return this._storage.exists(fileName)
      .pipe(switchMap(
        ifExists => {
          if (!ifExists) {
            return of(null);
          }
          return this._storage.load(fileName)
            .pipe(switchMap(file => {
              if (file === null) {
                return of(null);
              }
              return of(loader.fromStr(file));
            }));
        }
      ));
  }

  listDirectory(): Observable<string[]> {
    return this._storage.listPaths()
      .pipe(switchMap(paths => {
        if (!paths) {
          return of(null);
        }
        return of (paths.filter(path => path.startsWith(this._serializer.getPrefix())));
      }));
  }
}







/*
readDirObservable(dirName)
  .switchMap(fileList => readFilesObservable(fileList))
  .subscribe(
    data => console.log(data.fileName + ‘ read’), // do stuff with the data received
    err => { // manage error
      },
    () => console.log(‘All files read’)
  )
*/
