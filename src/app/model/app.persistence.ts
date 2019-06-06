import { Workspace } from './workspace';
import { Persistence } from './generic.persistence';

export class AppPersistence {
  static createGoogleDriveStorage() {}// TODO: Lower prio
  static createBrowserStorage() {

  }
  static createFileSystemStorage() {}// TODO: Lower prio
  constructor(private _persister: Persistence<Workspace>) {}

  get persister(): Persistence<Workspace> {
    return this._persister;
  }
}
