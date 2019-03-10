import {Persistence} from './generic.persistence';
import {AbstractFileStorage} from './abstract.file.storage';
import SpyObj = jasmine.SpyObj;
import {Serializer} from './serializer.interface';

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

describe('Persistence', () => {
  let componentUnderTest: Persistence<TestEntity>;
  let mockStorage: SpyObj<AbstractFileStorage>;
  let serializer: SpyObj<Serializer<TestEntity>>;
  let actual, expected, storageCallValue;
  let PREFIX;

  Given(() => {
    mockStorage = jasmine.createSpyObj('AbstractFileStorage', ['listPaths', 'load', 'save', 'exists']);
    serializer = jasmine.createSpyObj('TestEntitySerializer', ['fromStr', 'getIdentifier', 'toStr', 'getPrefix']);
    PREFIX = new TestEntitySerializer().getPrefix();
    serializer.getPrefix.and.returnValue(PREFIX);
    componentUnderTest = new Persistence<TestEntity>(mockStorage, serializer);
  });

  describe('METHOD: listDirectory', () => {
    When(() => {
      actual = componentUnderTest.listDirectory();
    });

    describe('Should fail with null, when storage op fails with null', () => {
      Given(() => {
        mockStorage.listPaths.and.returnValue(null);
      });
      Then(() => {
        expect(actual).toBeNull();
      });
    });

    describe('Should return only paths that start with required prefix', () => {
      Given(() => {
        storageCallValue = ['potatoes', PREFIX + 'potatoes', 'jolly', PREFIX + 'jolly'];
        mockStorage.listPaths.and.returnValue(storageCallValue);
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
      actual = entityIdentifiers.map(identifier => componentUnderTest.load(identifier));
    });

    describe('With invalid identifier should not call fileExists', () => {
      describe('Should return null when identifier is null/undefined', () => {
        Given(() => {
          entityIdentifiers = [null, undefined];
        });
        Then(() => {
          expect(actual).toEqual([null, null]);
          expect(mockStorage.exists.calls.any()).toBeFalsy();
        });
      });

      describe('Should return null, when identifier is empty or contains non-\\w symbols', () => {
        Given(() => {
          entityIdentifiers = [' Eeeh', 'Paraimary_123 ', 'squ-ash', '//parpetual.', ''];
        });
        Then(() => {
          expect(actual).toEqual([null, null, null, null, null]);
          expect(mockStorage.exists.calls.count()).toEqual(0);
        });
      });

      describe('Should return null, when storage fileExists returns true', () => {
        Given(() => {
          mockStorage.exists.and.returnValue(true);
          entityIdentifiers = ['Dio', 'Mario_123'];
        });
        Then(() => {
          expect(actual).toEqual([null, null]);
          expect(mockStorage.exists.calls.count()).toEqual(2);
        });
      });
    });

    describe('Should return null, when storage fileExists returns true', () => {
      Given(() => {
        mockStorage.exists.and.returnValue(true);
        entityIdentifiers = ['Dio', 'Mario_123'];
      });
      Then(() => {
        expect(actual).toEqual([null, null]);
        expect(mockStorage.exists.calls.count()).toEqual(2);
        expect(mockStorage.load.calls.any()).toBeFalsy();
      });
    });

    describe('When storage fileExists returns false', () => {
      Given(() => {
        mockStorage.exists.and.returnValue(false);
        entityIdentifiers = ['12_13', '12_13'];
      });

      describe('Should return null, if storage load returns null', () => {
        Given(() => {
          mockStorage.load.and.returnValue(null);
        });
        Then(() => {
          expect(actual).toEqual([null, null]);
          expect(mockStorage.exists.calls.count()).toEqual(2);
          expect(mockStorage.load.calls.count()).toEqual(2);
          expect(serializer.fromStr.calls.count()).toEqual(0);
        });
      });

      describe('Should return Object from load call, if it is not null', () => {
        let mockSerializedValue, mockValue;
        Given(() => {
          mockValue = new TestEntity(12, 13);
          mockSerializedValue = new TestEntitySerializer().toStr(mockValue);
          mockStorage.load.and.returnValue(mockSerializedValue);
          serializer.fromStr.and.returnValue(mockValue);
        });
        Then(() => {
          expected = [
            mockValue,
            mockValue
          ];
          const expectedCallValue = PREFIX + new TestEntitySerializer().getIdentifier(mockValue);

          expect(actual).toEqual(expected);
          expect(mockStorage.exists.calls.count()).toEqual(2);
          expect(mockStorage.load.calls.count()).toEqual(2);
          expect(serializer.fromStr.calls.count()).toEqual(2);
          expect(mockStorage.load.calls.mostRecent().args).toEqual([expectedCallValue]);
        });
      });
    });
  });

  describe('METHOD: save', () => {
    let testEntities;
    When(() => {
      actual = testEntities.map(entity => componentUnderTest.save(entity));

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
          mockStorage.exists.and.returnValue(true);
        });
        Then(() => {
          expect(actual).toEqual([false]);
          expect(mockStorage.exists.calls.count()).toEqual(1);
          expect(mockStorage.save.calls.count()).toEqual(0);
        });
      });

      describe('Storage exists and save return false', () => {
        Given(() => {
          mockStorage.exists.and.returnValue(false);
          mockStorage.save.and.returnValue(false);
        });
        Then(() => {
          expect(actual).toEqual([false]);
          expect(mockStorage.exists.calls.count()).toEqual(1);
          expect(mockStorage.save.calls.count()).toEqual(1);
        });
      });

      describe('And storage exists returns false, storage save returns true', () => {
        Given(() => {
          mockStorage.exists.and.returnValue(false);
          mockStorage.save.and.returnValue(true);
        });
        Then(() => {
          expect(actual).toEqual([true]);
          expect(mockStorage.exists.calls.count()).toEqual(1);
          expect(mockStorage.save.calls.count()).toEqual(1);
        });
      });
    });
  });
});
