import { AbstractFileStorage } from '../abstract.file.storage';
import { LocalForageService } from 'ngx-localforage';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export class BrowserFileStorage extends AbstractFileStorage {
  constructor(private localForage: LocalForageService) {
    super();
  }
  exists(path: string): Observable<boolean> {
    return this.localForage.keys()
      .pipe(map(
        keys => keys.find(val => val === path) !== undefined
      ));
  }

  listPaths(): Observable<string[]> {
    return this.localForage.keys();
  }

  load(path: string): Observable<string> {
    return this.localForage.getItem(path);
  }

  save(path: string, content: string): Observable<boolean> {
    return this.localForage.setItem(path, content)
      .pipe(map(() => true));
  }

}
