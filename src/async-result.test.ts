import { test, expect, describe, spyOn } from 'bun:test';
import { AsyncResult } from './async-result';

describe('AsyncResult', () => {
  test('from', async () => {
    expect(await AsyncResult.from(4)).toEqual(4);
    expect(await AsyncResult.from(() => Promise.resolve(4))).toEqual(4);
    expect(await AsyncResult.from(async () => 4)).toEqual(4);
    expect(await AsyncResult.from(Promise.resolve(4))).toEqual(4);
    expect(AsyncResult.from(Promise.reject(4)).toPromise()).rejects.toEqual(4);
    // prettier-ignore
    expect(AsyncResult.from(() => { throw 4 }).toPromise()).rejects.toEqual(4);
    // prettier-ignore
    expect(AsyncResult.from(async () => { throw 4 }).toPromise()).rejects.toEqual(4);
    // prettier-ignore
    expect(AsyncResult.from(async () => { return Promise.reject(4) }).toPromise()).rejects.toEqual(4);
  });
  test('resolve', async () => {
    expect(await AsyncResult.resolve(4)).toEqual(4);
    expect(await AsyncResult.resolve(Promise.resolve(4))).toEqual(4);
    expect(await AsyncResult.resolve(AsyncResult.resolve(4))).toEqual(4);
    expect(await AsyncResult.resolve(AsyncResult.resolve(AsyncResult.resolve(4)))).toEqual(4);
    expect(await AsyncResult.resolve(Promise.resolve(AsyncResult.resolve(4)))).toEqual(4);
    expect(await Promise.resolve(Promise.resolve(AsyncResult.resolve(4)))).toEqual(4);
    expect(await Promise.resolve(AsyncResult.resolve(AsyncResult.resolve(4)))).toEqual(4);
    expect(await Promise.resolve(AsyncResult.resolve(Promise.resolve(4)))).toEqual(4);
  });
  test('reject', async () => {
    expect(AsyncResult.reject(4).toPromise()).rejects.toBe(4);
    expect(Promise.resolve(AsyncResult.reject(Promise.resolve(4)))).rejects.toBeInstanceOf(Promise);
    expect(Promise.resolve(AsyncResult.reject(Promise.resolve(4)))).rejects.toBeInstanceOf(Promise);
  });
  test('then', async () => {
    expect(
      AsyncResult.resolve(4)
        .then((x) => x + 2)
        .then((x) => x * 2)
        .toPromise()
    ).resolves.toBe(12);
    expect(
      AsyncResult.reject(4)
        .then(
          () => 0,
          (x) => x * 2
        )
        .toPromise()
    ).resolves.toBe(8);
    expect(
      AsyncResult.reject(4)
        .then(
          () => 0,
          (x) => {
            throw x * 2;
          }
        )
        .toPromise()
    ).rejects.toBe(8);
    expect(
      AsyncResult.reject(4)
        .then(
          () => 0,
          async (x) => Promise.reject(x * 2)
        )
        .toPromise()
    ).rejects.toBe(8);
    expect(
      AsyncResult.reject(4)
        .then(
          () => 0,
          (x) => AsyncResult.reject(x * 2)
        )
        .toPromise()
    ).rejects.toBe(8);
    expect(
      AsyncResult.reject(4)
        .then(
          () => 0,
          async (x) => AsyncResult.reject(x * 2)
        )
        .toPromise()
    ).rejects.toBe(8);
    expect(
      AsyncResult.reject(4)
        .then(
          () => 0,
          async (x) => await AsyncResult.reject(x * 2)
        )
        .toPromise()
    ).rejects.toBe(8);
  });
  test('catch', async () => {
    expect(
      AsyncResult.resolve(3)
        .catch(() => 0)
        .toPromise()
    ).resolves.toBe(3);
    expect(
      AsyncResult.reject(3)
        .catch((x) => x + 2)
        .toPromise()
    ).resolves.toBe(5);
    expect(
      AsyncResult.reject(3)
        .catch(async (x) => x + 2)
        .toPromise()
    ).resolves.toBe(5);
    expect(
      AsyncResult.reject(3)
        .catch(async (x) => AsyncResult.resolve(x + 2))
        .toPromise()
    ).resolves.toBe(5);
    expect(
      AsyncResult.reject(3)
        .catch(async (x) => AsyncResult.reject(x + 2))
        .toPromise()
    ).rejects.toBe(5);
  });
  test('from', async () => {
    expect(AsyncResult.from(3).toPromise()).resolves.toBe(3);
    expect(AsyncResult.from(() => 3).toPromise()).resolves.toBe(3);
    expect(AsyncResult.from(async () => 3).toPromise()).resolves.toBe(3);
    expect(AsyncResult.from(async () => Promise.reject(3)).toPromise()).rejects.toBe(3);
    expect(
      AsyncResult.from(async () => {
        throw 3;
      }).toPromise()
    ).rejects.toBe(3);
    expect(
      AsyncResult.from(async () => {
        throw 3;
      })
        .mapErr(() => 7)
        .toPromise()
    ).rejects.toBe(7);
  });
  expect(
    AsyncResult.reject(3)
      .mapErr(() => 7)
      .toPromise()
  ).rejects.toBe(7);
  test('mapErr', () => {
    expect(
      AsyncResult.reject(3)
        .mapErr(() => 7)
        .toPromise()
    ).rejects.toBe(7);
    expect(
      AsyncResult.resolve(3)
        .mapErr(() => 7)
        .toPromise()
    ).resolves.toBe(3);
  });
  test('pair', async () => {
    expect(await AsyncResult.resolve(4).pair()).toEqual([4, undefined]);
    expect(await AsyncResult.reject(4).pair()).toEqual([undefined, 4]);
    expect(AsyncResult.resolve(undefined).pair().toPromise()).resolves.toEqual([
      undefined,
      undefined
    ]);
  });
  test('guard', async () => {
    expect(
      AsyncResult.resolve(4)
        .guard((x) => x % 2 == 0, 'expect even number')
        .pair()
        .toPromise()
    ).resolves.toEqual([4, undefined]);
    expect(
      AsyncResult.resolve('hi-me' as `${'hi' | 'ho'}-${'me' | 'you'}`)
        .guard((x): x is typeof x & `${string}me` => x.endsWith('me'), 'NEED *-me' as const)
        .pair()
        .toPromise()
    ).resolves.toEqual(['hi-me', undefined]);
    expect(
      AsyncResult.resolve('hi-me' as `${'hi' | 'ho'}-${'me' | 'you'}`)
        .guard((x): x is typeof x & `${string}me` => x.endsWith('me'), 'NEED *-me' as const)
        .pair()
        .toPromise()
    ).resolves.toEqual(['hi-me', undefined]);
    expect(
      AsyncResult.resolve('hi-you' as `${'hi' | 'ho'}-${'me' | 'you'}`)
        .guard((x): x is typeof x & `${string}me` => x.endsWith('me'), 'NEED *-me' as const)
        .pair()
        .toPromise()
    ).resolves.toEqual([undefined, 'NEED *-me']);
    expect(
      AsyncResult.resolve(3)
        .guard((x) => x % 2 == 0, 'expect even number')
        .pair()
        .toPromise()
    ).resolves.toEqual([undefined, 'expect even number']);
  });
  test('flatten', async () => {
    expect(await AsyncResult.resolve(3).flatten()).toEqual(3);
    expect(await AsyncResult.reject(3).flatten()).toEqual(3);
  });
  test('swap', async () => {
    expect(await AsyncResult.resolve(3).swap().pair()).toEqual([undefined, 3]);
    expect(await AsyncResult.reject(3).swap().pair()).toEqual([3, undefined]);
  });
  test('tap', async () => {
    const csl = { log() {}, error() {} };
    const log = spyOn(csl, 'log');
    const log2 = spyOn(csl, 'error');
    expect(await AsyncResult.resolve(3).tap(log).tapErr(log2).pair()).toEqual([3, undefined]);
    expect(log).toHaveBeenCalledWith(3);
    expect(log2).not.toHaveBeenCalled();
  });
  test('tapErr', async () => {
    const csl = { log() {}, error() {} };
    const log = spyOn(csl, 'log');
    const log2 = spyOn(csl, 'error');
    expect(await AsyncResult.reject(3).tap(log).tapErr(log2).pair()).toEqual([undefined, 3]);
    expect(log).not.toHaveBeenCalled();
    expect(log2).toHaveBeenCalledWith(3);
  });
  test('fallback', async () => {
    expect(await AsyncResult.reject(3).fallback(5)).toEqual(5);
    expect(await AsyncResult.resolve(3).fallback(5)).toEqual(3);
  });
  test('pipe', async () => {
    expect(AsyncResult.resolve(5).pipe().toPromise()).resolves.toBe(5);
    expect(
      AsyncResult.resolve(5)
        .pipe((x) => `${x}`)
        .pipe((x) => `${x}-${x}`)
        .toPromise()
    ).resolves.toBe(`5-5`);
    expect(
      AsyncResult.resolve(5)
        .pipe(async (x) => `${x}`)
        .pipe((x) => AsyncResult.resolve(`${x}-${x}` as const))
        .pipe(async (x) => AsyncResult.resolve(`**${x}` as const))
        .toPromise()
    ).resolves.toBe(`**5-5`);
    expect(
      AsyncResult.resolve(5)
        .pipe(async (x) => `${x}`)
        .pipe((x) => {
          if (x == '5') throw 999;
          return x;
        })
        .pipe(async (x) => AsyncResult.resolve(`**${x}` as const))
        .toPromise()
    ).rejects.toBe(999);
    expect(
      AsyncResult.resolve(5)
        .pipe(
          async (x) => `${x}`,
          (x) => {
            if (x == '5') throw 999;
            return x;
          },
          async (x) => AsyncResult.resolve(`**${x}` as const)
        )
        .toPromise()
    ).rejects.toBe(999);
    expect(
      AsyncResult.resolve(0)
        .pipe(
          (x) => x + 1,
          (x) => Promise.resolve(x + 1),
          (x) => Promise.resolve(Promise.resolve(x + 1)),
          (x) => AsyncResult.resolve(Promise.resolve(x + 1)),
          (x) => Promise.resolve(AsyncResult.resolve(x + 1)),
          async (x) => x + 1,
          async (x) => Promise.resolve(x + 1),
          async (x) => Promise.resolve(Promise.resolve(x + 1)),
          async (x) => AsyncResult.resolve(Promise.resolve(x + 1)),
          async (x) => Promise.resolve(AsyncResult.resolve(x + 1))
        )
        .toPromise()
    ).resolves.toBe(10);
    expect(
      AsyncResult.resolve(4)
        .pipe(
          (x) => x + 1,
          (x) => x + 1,
          (x) => {
            if (x == 4) throw 'NOT 4';
            return x;
          },
          (x) => `OK ${x}`
        )
        .toPromise()
    ).resolves.toEqual('OK 6');
    expect(
      AsyncResult.resolve(4)
        .pipe(
          (x) => x + 1,
          (x) => x + 1,
          (x) => {
            if (x == 6) throw 'NOT 6';
            return x;
          },
          (x) => `OK ${x}`
        )
        .toPromise()
    ).rejects.toEqual('NOT 6');
    expect(
      AsyncResult.resolve(0)
        .pipe(
          (x) => (x == 3 ? AsyncResult.reject('NOT 3' as const) : x),
          (x) => (x == 6 ? AsyncResult.reject('NOT 6' as const) : x),
          (x) => (x == 9 ? AsyncResult.reject('NOT 9' as const) : x)
        )
        .toPromise()
    ).resolves.toEqual(0);
    expect(
      AsyncResult.resolve(6)
        .pipe(
          (x) => (x == 3 ? AsyncResult.reject('NOT 3' as const) : x),
          (x) => (x == 6 ? AsyncResult.reject('NOT 6' as const) : x),
          (x) => (x == 9 ? AsyncResult.reject('NOT 9' as const) : x)
        )
        .toPromise()
    ).rejects.toEqual('NOT 6');
    expect(
      AsyncResult.resolve(0)
        .pipe(
          (x) => (x == 3 ? AsyncResult.reject('NOT 3' as const) : x),
          (x) => x + 3,
          (x) => (x == 6 ? AsyncResult.reject('NOT 6' as const) : x),
          (x) => x + 6,
          (x) => (x == 9 ? AsyncResult.reject('NOT 9' as const) : x)
        )
        .toPromise()
    ).rejects.toEqual('NOT 9');
    const noopFn = { identity: <T>(x: T) => x };
    const nocal = spyOn(noopFn, 'identity');
    expect(
      await AsyncResult.reject(0)
        .pipe(
          noopFn.identity,
          noopFn.identity,
          (x) => x + 3,
          noopFn.identity,
          (x) => x + 6,
          noopFn.identity
        )
        .pair()
        .toPromise()
    ).toEqual([undefined, 0]);
    expect(nocal).not.toHaveBeenCalled();
    nocal.mockClear();
    expect(
      await AsyncResult.resolve(0)
        .pipe(
          noopFn.identity,
          (x) => x + 3,
          noopFn.identity,
          async (x) => x + 6,
          noopFn.identity,
          noopFn.identity,
          noopFn.identity
        )
        .pair()
        .toPromise()
    ).toEqual([9, undefined]);
    expect(nocal).toBeCalledTimes(5);
    expect(nocal).nthCalledWith(1, 0);
    expect(nocal).nthCalledWith(2, 3);
    expect(nocal).nthCalledWith(3, 9);
    expect(nocal).nthCalledWith(4, 9);
    expect(nocal).nthCalledWith(5, 9);
    nocal.mockClear();
    expect(
      await AsyncResult.resolve(0)
        .pipe(
          noopFn.identity,
          (x) => x + 3,
          noopFn.identity,
          (x) => (x == 3 ? AsyncResult.reject('hah' as const) : x),
          async (x) => x + 6,
          noopFn.identity,
          noopFn.identity,
          noopFn.identity
        )
        .pair()
        .toPromise()
    ).toEqual([undefined, 'hah']);
    expect(nocal).toBeCalledTimes(2);
    expect(nocal).nthCalledWith(1, 0);
    expect(nocal).nthCalledWith(2, 3);
    nocal.mockClear();

    expect(
      await AsyncResult.resolve(5)
        .pipe(
          (x) => (x == 5 ? AsyncResult.reject('err' as const) : x),
          (x) => (x % 2 == 1 ? AsyncResult.reject('err2' as const) : AsyncResult.resolve(x)),
          (x) => (x == 5 ? AsyncResult.reject('err3' as const) : x)
        )
        .pair()
        .toPromise()
    ).toEqual([undefined, 'err']);
  });
  // prettier-ignore
  test('all', async () => {
    expect(AsyncResult.all(undefined as any).toPromise()).rejects.toEqual(expect.any(Error));
    expect(AsyncResult.all(null as any).toPromise()).rejects.toEqual(expect.any(Error));
    expect(AsyncResult.all(1 as any).toPromise()).rejects.toEqual(expect.any(Error));
    expect(AsyncResult.all(1.23 as any).toPromise()).rejects.toEqual(expect.any(Error));
    expect(AsyncResult.all("satring" as any).toPromise()).rejects.toEqual(expect.any(Error));
    expect(AsyncResult.all((() => {}) as any).toPromise()).rejects.toEqual(expect.any(Error));
    expect(AsyncResult.all({}).toPromise()).resolves.toEqual({});
    expect(AsyncResult.all([]).toPromise()).resolves.toEqual([]);
    expect(AsyncResult.all([1, 2, 3]).toPromise()).resolves.toEqual([1, 2, 3]);
    expect(AsyncResult.all([() => 1, async () => 2, () => AsyncResult.resolve(3)]).toPromise()).resolves.toEqual([expect.any(Function), expect.any(Function), expect.any(Function)]);
    expect(AsyncResult.all([1, async () => 2, AsyncResult.resolve(3)]).toPromise()).resolves.toEqual([1, expect.any(Function), 3]);
    expect(AsyncResult.all([1, 2, Promise.reject(3)]).toPromise()).rejects.toEqual(3);
    expect(AsyncResult.all([1, 2, AsyncResult.reject(3)]).toPromise()).rejects.toEqual(3);
    expect(AsyncResult.all([1, () => () => 2]).toPromise()).resolves.toEqual([1, expect.any(Function)]);
    expect(AsyncResult.all({ a: 1, b: Promise.resolve(2), c: AsyncResult.resolve(3)}).toPromise()).resolves.toEqual({ a: 1, b: 2, c: 3 });
    expect(AsyncResult.all({ a: 1, b: Promise.reject(2), c: AsyncResult.reject(3) }).toPromise()).rejects.toBeInteger();
    expect(AsyncResult.all({ a: 1, b: Promise.resolve([7,8,9]), c: { d: AsyncResult.resolve(1)} }).toPromise()).resolves.toMatchObject({ a: 1, b: [7,8,9], c: { d: expect.any(AsyncResult) } }); 
    expect(AsyncResult.all({ a: AsyncResult.from(() => ({ aa: 99 })), b: Promise.resolve([7,8,9]), c: AsyncResult.resolve("str"), f: () => {} }).toPromise()).resolves.toMatchObject({ a: { aa: 99 }, b: [7,8,9], c: "str", f: expect.any(Function) }); 
  });
});