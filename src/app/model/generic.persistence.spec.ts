import {Persistence} from './generic.persistence';
import {AbstractFileStorage} from './abstract.file.storage';
import SpyObj = jasmine.SpyObj;
import {Serializer} from './serializer.interface';
import { Observable, of } from 'rxjs';
import { Mock } from 'protractor/built/driverProviders';

class TestEntity {
  constructor(private _a: number, private _b: number) {}
  get a(): number {return this._a; }
  get b(): number {return this._b; }
}

class TestEntitySerializer implements Serializer<TestEntity> {
  fromStr(serializedEntity: string): TestEntity {
    const args = serializedEntity.split('/').map(val => parseInt(val, 10));
    return new TestEntity(args[0], args[1]);
  }
  getIdentifier(entity: TestEntity): string { return entity.a + '_' + entity.b; }
  getPrefix(): string { return 'PREF_'; }
  toStr(entity: TestEntity): string { return entity.a + '/' + entity.b; }
}

class MockStorage implements AbstractFileStorage {
  mock = {
    exists: {value: null, callHistory: []},
    listPaths: {value: null, callHistory: []},
    load: {value: null, callHistory: []},
    save: {value: null, callHistory: []}
  };

  exists(path: string): Observable<boolean> {
    return this.mockCall('exists', path);
  }

  listPaths(): Observable<string[]> {
    return this.mockCall('listPaths');
  }

  load(path: string): Observable<string> {
    return this.mockCall('load', path);
  }

  save(path: string, content: string): Observable<boolean> {
    return this.mockCall('save', path, content);
  }
  private mockCall(methodName, ...args): Observable<any> {
    const mockMethod = this.mock[methodName];
    mockMethod.callHistory.push([...args]);
    return of(mockMethod.value);
  }
}

describe('Persistence', () => {
  let componentUnderTest: Persistence<TestEntity>;
  let mockStorage: MockStorage;
  let serializer: SpyObj<Serializer<TestEntity>>;
  let actual, expected, storageCallValue;
  let PREFIX;

  Given(() => {
    mockStorage = new MockStorage();
    serializer = jasmine.createSpyObj('TestEntitySerializer', ['fromStr', 'getIdentifier', 'toStr', 'getPrefix']);
    PREFIX = new TestEntitySerializer().getPrefix();
    serializer.getPrefix.and.returnValue(PREFIX);
    componentUnderTest = new Persistence<TestEntity>(mockStorage, serializer);
  });

  describe('METHOD: listDirectory', () => {
    When(() => {
      componentUnderTest.listDirectory().subscribe(returnValue => actual = returnValue);
    });

    describe('Should fail with null, when storage op fails with null', () => {
      Given(() => {
        mockStorage.mock.listPaths.value = null;
      });
      Then(() => {
        expect(actual).toBeNull();
      });
    });

    describe('Should return only paths that start with required prefix', () => {
      Given(() => {
        storageCallValue = ['potatoes', PREFIX + 'potatoes', 'jolly', PREFIX + 'jolly'];
        mockStorage.mock.listPaths.value = storageCallValue;
      });
      Then(() => {
        expected = [PREFIX + 'potatoes', PREFIX + 'jolly'];
        expect(actual).toEqual(expected);
      });
    });
  });

  describe('METHOD: load', () => {
    let entityIdentifiers;
    When(() => {
      actual = [];
      entityIdentifiers.forEach(identifier =>
        componentUnderTest.load(identifier)
          .subscribe(loadedValue => actual.push(loadedValue)));
    });

    describe('With invalid identifier should not call fileExists', () => {
      describe('Should return null when identifier is null/undefined', () => {
        Given(() => {
          entityIdentifiers = [null, undefined];
        });
        Then(() => {
          expect(actual).toEqual([null, null]);
          expect(mockStorage.mock.exists.callHistory).toEqual([]);
        });
      });

      describe('Should return null, when identifier is empty or contains non-\\w symbols', () => {
        Given(() => {
          entityIdentifiers = [' Eeeh', 'Paraimary_123 ', 'squ-ash', '//parpetual.', ''];
        });
        Then(() => {
          expect(actual).toEqual([null, null, null, null, null]);
          expect(mockStorage.mock.exists.callHistory).toEqual([]);
        });
      });
    });

    describe('Should return null, when storage fileExists returns false', () => {
      Given(() => {
        mockStorage.mock.exists.value = false;
        entityIdentifiers = ['Dio', 'Mario_123'];
      });
      Then(() => {
        expect(actual).toEqual([null, null]);
        expect(mockStorage.mock.exists.callHistory.length).toEqual(2);
        expect(mockStorage.mock.load.callHistory.length).toEqual(0);
      });
    });

    describe('When storage fileExists returns true', () => {
      Given(() => {
        mockStorage.mock.exists.value = true;
        entityIdentifiers = ['12_13', '12_13'];
      });

      describe('Should return null, if storage load returns null', () => {
        Given(() => {
          mockStorage.mock.load.value = null;
        });
        Then(() => {
          expect(actual).toEqual([null, null]);
          expect(mockStorage.mock.exists.callHistory.length).toEqual(2);
          expect(mockStorage.mock.load.callHistory.length).toEqual(2);
          expect(serializer.fromStr.calls.count()).toEqual(0);
        });
      });

      describe('Should return Object from load call, if it is not null', () => {
        let mockSerializedValue, mockValue;
        Given(() => {
          mockValue = new TestEntity(12, 13);
          mockSerializedValue = new TestEntitySerializer().toStr(mockValue);
          mockStorage.mock.load.value = mockSerializedValue;
          serializer.fromStr.and.returnValue(mockValue);
        });
        Then(() => {
          expected = [
            mockValue,
            mockValue
          ];
          const expectedCallValue = PREFIX + new TestEntitySerializer().getIdentifier(mockValue);

          expect(actual).toEqual(expected);
          expect(mockStorage.mock.exists.callHistory.length).toEqual(2);
          expect(mockStorage.mock.load.callHistory.length).toEqual(2);
          expect(serializer.fromStr.calls.count()).toEqual(2);
          const mockCallHistory = mockStorage.mock.load.callHistory;
          expect(mockCallHistory[mockCallHistory.length - 1]).toEqual([expectedCallValue]);
        });
      });
    });
  });

  describe('METHOD: save', () => {
    let testEntities;
    When(() => {
      actual = [];
      testEntities.forEach(
        entity => componentUnderTest.save(entity).subscribe(value => actual.push(value))
      );
    });

    describe('Given a bad testEntity, expect call to return null', () => {
      Given(() => {
        testEntities = [null, undefined];
      });
      Then(() => {
        expected = [false, false];
        expect(actual).toEqual(expected);
      });
    });

    describe('Given an okay testEntity', () => {
      Given(() => {
        testEntities = [new TestEntity(1, 2)];
      });

      describe('Storage exists returns true', () => {
        Given(() => {
          mockStorage.mock.exists.value = true;
        });
        Then(() => {
          expect(actual).toEqual([false]);
          expect(mockStorage.mock.exists.callHistory.length).toEqual(1);
          expect(mockStorage.mock.save.callHistory.length).toEqual(0);
        });
      });

      describe('Storage exists and save return false', () => {
        Given(() => {
          mockStorage.mock.exists.value = false;
          mockStorage.mock.save.value = false;
        });
        Then(() => {
          expect(actual).toEqual([false]);
          expect(mockStorage.mock.exists.callHistory.length).toEqual(1);
          expect(mockStorage.mock.save.callHistory.length).toEqual(1);
        });
      });

      describe('And storage exists returns false, storage save returns true', () => {
        Given(() => {
          mockStorage.mock.exists.value = false;
          mockStorage.mock.save.value = true;
        });
        Then(() => {
          expect(actual).toEqual([true]);
          expect(mockStorage.mock.exists.callHistory.length).toEqual(1);
          expect(mockStorage.mock.save.callHistory.length).toEqual(1);
        });
      });
    });
  });
});
