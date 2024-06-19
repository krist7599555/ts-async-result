type Fn<I, O> = (arg: I) => O;
type InferValue<T> = Awaited<T>;
type InferError<T> = T extends AsyncResult<any, infer E> ? InferValue<E> : never;

/**
 * # AsyncResult
 * `Promise` Wrapper which provide errror type & more method
 *
 * ## Creation
 * @example
 * ```typescript
 * AsyncResult.from(async () => fetch(str))
 * AsyncResult.from(() => fetch(str))
 * AsyncResult.from(fetch(str))
 * AsyncResult.resolve("OK")
 * AsyncResult.reject("Er")
 * ```
 * ## Transform
 * @example
 * ```typescript
 * const out = await AsyncResult
 *   .from(async () => fetch(str))
 *   .assert(res => res.status == 200, (res) => new HttpError(res.status))
 *   .then(res => res.json())
 *   .tap(data => console.log("raw data:", data))
 *   .then(data => data || {})
 * ```
 * @example
 * ```typescript
 * const [ok, err] = await AsyncResult
 *   .from(async () => fetch(str))
 *   .pipe(
 *      res => res.status == 200 : res : AsyncResult.reject(new HttpError(res.status)),
 *      res => res.json(),
 *      data => data || {}
 *   )
 *   .pair()
 * ```
 * ## Limitation
 * - 1. Async Function Will discard error type
 * ```typescript
 * const bad: Promise<never> = AsyncResult.from(async () => AsyncResult.reject('ERROR' as const));
 * const better: AsyncResult<never, "ERROR"> = AsyncResult.from(() => AsyncResult.reject('ERROR' as const));
 * ```
 */
export class AsyncResult<V, E> implements PromiseLike<V> {
  private readonly promise: Promise<V>;
  constructor(fn: (resolve: Fn<V, void>, reject: Fn<E, void>) => void) {
    this.promise = new Promise(fn);
  }
  static NEVER = new AsyncResult<never, never>(() => {});
  static EMPTY = AsyncResult.resolve(undefined as void);
  static resolve<V>(value: V): AsyncResult<InferValue<V>, never> {
    return new AsyncResult(async (res, rej) => {
      try {
        res((await value) as any);
      } catch (err) {
        rej(err as any as never);
      }
    });
  }
  static reject<E>(error: E): AsyncResult<never, E> {
    return new AsyncResult((_res, rej) => rej(error));
  }

  static from<T>(data: T | Fn<void, T>): AsyncResult<InferValue<T>, InferError<T>> {
    return new AsyncResult(async (res, rej) => {
      try {
        if (data instanceof Function) {
          res((await data()) as any);
        } else {
          res((await data) as any);
        }
      } catch (err) {
        rej(err as any);
      }
    });
  }

  toPromise() {
    return this.promise;
  }

  then<Out>(onfulfilled: Fn<V, Out>): AsyncResult<InferValue<Out>, InferError<Out>>;
  then<Out, Out2>(
    onfulfilled: Fn<V, Out>,
    onrejected: Fn<E, Out2>
  ): AsyncResult<InferValue<Out> | InferValue<Out2>, InferError<Out> | InferError<Out2>>;
  then(
    fn_ok: Fn<V, any>,
    fn_err: Fn<E, any> = (v) => {
      throw v;
    }
  ) {
    return new AsyncResult(async (resolve, reject) => {
      try {
        await this.promise.then(
          async (val) => resolve(await fn_ok(val)),
          async (err) => resolve(await fn_err(err))
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  catch<Out>(fn: Fn<E, Out>): AsyncResult<V | InferValue<Out>, InferError<Out>> {
    return new AsyncResult(async (resolve, reject) => {
      try {
        resolve(await this.promise);
      } catch (err) {
        try {
          resolve((await fn(err as E)) as any);
        } catch (err2) {
          reject((await err2) as any);
        }
      }
    });
  }

  flatten() {
    return this.then(
      (ok) => AsyncResult.resolve(ok),
      (err) => AsyncResult.resolve(err)
    );
  }
  swap() {
    return this.then(
      (ok) => AsyncResult.reject(ok),
      (err) => AsyncResult.resolve(err)
    );
  }

  pair(): AsyncResult<
    (V extends never ? never : [V, undefined]) | (E extends never ? never : [undefined, E]),
    never
  > {
    return this.then(
      (val) => [val, undefined] as any,
      (err) => [undefined, err] as any
    ) as any;
  }

  guard<V2 extends V, E2>(
    fn: (val: V) => val is V2,
    on_false: E2 | Fn<V, E2>
  ): AsyncResult<V2, E | E2>;
  guard<V2, E2>(fn: (val: any) => val is V2, on_false: E2 | Fn<V, E2>): AsyncResult<V2, E | E2>;
  guard<E2>(fn: Fn<V, boolean>, on_false: E2 | Fn<V, E2>): AsyncResult<V, E | E2>;
  guard<E2>(fn: Fn<V, boolean>, on_false: E2 | Fn<V, E2>) {
    return this.then(
      (value) =>
        fn(value)
          ? AsyncResult.resolve(value)
          : AsyncResult.reject(on_false instanceof Function ? on_false(value) : on_false),
      (err) => AsyncResult.reject(err)
    );
  }

  mapErr<E2>(fn: Fn<E, E2>): AsyncResult<V, Awaited<E2>> {
    return new AsyncResult(async (res, rej) => {
      try {
        return res(await this);
      } catch (err) {
        return rej(await fn(err as E));
      }
    });
  }
  tap(fn: Fn<V, any>): AsyncResult<V, E> {
    return this.then(async (val) => {
      await fn(val);
      return val;
    });
  }
  tapErr(fn: Fn<E, void | Promise<void>>): AsyncResult<V, E> {
    return this.mapErr(async (err) => {
      await fn(err);
      return err;
    });
  }
  fallback<V2>(value: V2): AsyncResult<V | V2, never> {
    return this.then(
      (ok) => Promise.resolve(ok),
      () => Promise.resolve(value)
    );
  }
  static all<T extends readonly unknown[] | [] | Record<string, any>>(
    data: T
  ): AsyncResult<{ -readonly [P in keyof T]: InferValue<T[P]> }, InferError<T[keyof T]>> {
    if (Array.isArray(data)) {
      return AsyncResult.from(() => Promise.all(data)) as any;
    } else if (typeof data === 'object' && data != null) {
      return AsyncResult.resolve(data).pipe(
        (o) => Object.entries(o),
        (o) => o.map(async ([k, v]) => [k, await v] as const),
        (o) => Promise.all(o),
        (o) => Object.fromEntries(o),
        (o) => o
      ) as any;
    } else {
      return AsyncResult.reject(
        new Error(`AsyncResult.all expect to pass Array or Object but got ${typeof data}`)
      ) as any;
    }
  }

  /**
   * Gen Pipe With Code
   * @exmaple
   * ```javascript
   * // GENERATE WITH THIS CODE
   * function printPipes(n = 10) {
        function _getPipe(n) {
          const arr = Array.from({ length: n }).map((_, i) => i + 1);
          const os = arr.map((i) => `O${i}`);
          let fn = `pipe<${os.join(', ')}>`
          let args = arr.map(i => `f${i}: Fn<InferValue<${i == 1 ? 'V' : `O${i-1}`}>, O${i}>`).join(', ')
          let out = `AsyncResult<InferValue<O${n}>, E | InferError<${os.join(' | ')}>>`
          return `${fn}(${args}): ${out};`
        }
        console.log(Array.from({ length: n }).map((_, i) => `// prettier-ignore\n` + _getPipe(i + 1)).join('\n'))
      }
   * ```
   */
  pipe(): AsyncResult<V, E>;
  // prettier-ignore
  pipe<O1>(f1: Fn<InferValue<V>, O1>): AsyncResult<InferValue<O1>, E | InferError<O1>>;
  // prettier-ignore
  pipe<O1, O2>(f1: Fn<InferValue<V>, O1>, f2: Fn<InferValue<O1>, O2>): AsyncResult<InferValue<O2>, E | InferError<O1 | O2>>;
  // prettier-ignore
  pipe<O1, O2, O3>(f1: Fn<InferValue<V>, O1>, f2: Fn<InferValue<O1>, O2>, f3: Fn<InferValue<O2>, O3>): AsyncResult<InferValue<O3>, E | InferError<O1 | O2 | O3>>;
  // prettier-ignore
  pipe<O1, O2, O3, O4>(f1: Fn<InferValue<V>, O1>, f2: Fn<InferValue<O1>, O2>, f3: Fn<InferValue<O2>, O3>, f4: Fn<InferValue<O3>, O4>): AsyncResult<InferValue<O4>, E | InferError<O1 | O2 | O3 | O4>>;
  // prettier-ignore
  pipe<O1, O2, O3, O4, O5>(f1: Fn<InferValue<V>, O1>, f2: Fn<InferValue<O1>, O2>, f3: Fn<InferValue<O2>, O3>, f4: Fn<InferValue<O3>, O4>, f5: Fn<InferValue<O4>, O5>): AsyncResult<InferValue<O5>, E | InferError<O1 | O2 | O3 | O4 | O5>>;
  // prettier-ignore
  pipe<O1, O2, O3, O4, O5, O6>(f1: Fn<InferValue<V>, O1>, f2: Fn<InferValue<O1>, O2>, f3: Fn<InferValue<O2>, O3>, f4: Fn<InferValue<O3>, O4>, f5: Fn<InferValue<O4>, O5>, f6: Fn<InferValue<O5>, O6>): AsyncResult<InferValue<O6>, E | InferError<O1 | O2 | O3 | O4 | O5 | O6>>;
  // prettier-ignore
  pipe<O1, O2, O3, O4, O5, O6, O7>(f1: Fn<InferValue<V>, O1>, f2: Fn<InferValue<O1>, O2>, f3: Fn<InferValue<O2>, O3>, f4: Fn<InferValue<O3>, O4>, f5: Fn<InferValue<O4>, O5>, f6: Fn<InferValue<O5>, O6>, f7: Fn<InferValue<O6>, O7>): AsyncResult<InferValue<O7>, E | InferError<O1 | O2 | O3 | O4 | O5 | O6 | O7>>;
  // prettier-ignore
  pipe<O1, O2, O3, O4, O5, O6, O7, O8>(f1: Fn<InferValue<V>, O1>, f2: Fn<InferValue<O1>, O2>, f3: Fn<InferValue<O2>, O3>, f4: Fn<InferValue<O3>, O4>, f5: Fn<InferValue<O4>, O5>, f6: Fn<InferValue<O5>, O6>, f7: Fn<InferValue<O6>, O7>, f8: Fn<InferValue<O7>, O8>): AsyncResult<InferValue<O8>, E | InferError<O1 | O2 | O3 | O4 | O5 | O6 | O7 | O8>>;
  // prettier-ignore
  pipe<O1, O2, O3, O4, O5, O6, O7, O8, O9>(f1: Fn<InferValue<V>, O1>, f2: Fn<InferValue<O1>, O2>, f3: Fn<InferValue<O2>, O3>, f4: Fn<InferValue<O3>, O4>, f5: Fn<InferValue<O4>, O5>, f6: Fn<InferValue<O5>, O6>, f7: Fn<InferValue<O6>, O7>, f8: Fn<InferValue<O7>, O8>, f9: Fn<InferValue<O8>, O9>): AsyncResult<InferValue<O9>, E | InferError<O1 | O2 | O3 | O4 | O5 | O6 | O7 | O8 | O9>>;
  // prettier-ignore
  pipe<O1, O2, O3, O4, O5, O6, O7, O8, O9, O10>(f1: Fn<InferValue<V>, O1>, f2: Fn<InferValue<O1>, O2>, f3: Fn<InferValue<O2>, O3>, f4: Fn<InferValue<O3>, O4>, f5: Fn<InferValue<O4>, O5>, f6: Fn<InferValue<O5>, O6>, f7: Fn<InferValue<O6>, O7>, f8: Fn<InferValue<O7>, O8>, f9: Fn<InferValue<O8>, O9>, f10: Fn<InferValue<O9>, O10>): AsyncResult<InferValue<O10>, E | InferError<O1 | O2 | O3 | O4 | O5 | O6 | O7 | O8 | O9 | O10>>;
  pipe(...fns: Function[]) {
    return new AsyncResult(async (resolve, reject) => {
      try {
        let data = await this;
        for (const fn of fns) {
          data = await fn(data);
        }
        return resolve(data);
      } catch (err) {
        return reject(err);
      }
    });
  }
}