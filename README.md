# ts-async-result

[![npm @krist7599555/ts-async-result](https://img.shields.io/npm/v/@krist7599555/ts-async-result)](https://www.npmjs.com/package/@krist7599555/ts-async-result)

```typescript
class AsyncResult<Value, Error> implements PromiseLike<Value>;
```

**Promise that not suck !!**

- same api as native `Promise`
- add Error Type
- add Chain Utility Method like OOP

## Install

```bash
bun add @krist7599555/ts-async-result
```

## Usage

```typescript
import { AsyncResult } from '@krist7599555/ts-async-result';
```

### Creation

```typescript
new AsyncResult<V, T>((resolve, reject) => { ... })
```

```typescript
AsyncResult.from(async () => fetch(str)) // from () => Promise
AsyncResult.from(() => fetch(str))
AsyncResult.from(fetch(str)) // from Promise
AsyncResult.resolve("OK") // from Value
AsyncResult.reject("Er")
AsyncResult.EMPTY // always resolve undefined
AsyncResult.NEVER // never resolve
```

### Transform

```typescript
// chain method
const out = await AsyncResult
  .from(async () => fetch(str))
  .guard(res => res.status == 200, (res) => new HttpError(res.status))
  .then(res => res.json())
  .tap(data => console.log("raw data:", data))
  .then(data => data || {})
```

```typescript
// pipe
const [ok, err] = await AsyncResult
  .from(async () => fetch(str))
  .pipe(
    // condition return resolve/reject
    res => res.status == 200
      ? res
      : AsyncResult.reject(new HttpError(res.status)),
    res => res.json(), // async function
    data => data || {} // sync function
  )
  .pair()
```

### More

look at [async-result.test.ts](./src/async-result.test.ts)

## Limitation

1. Async Function Will discard error type

    ```typescript
    const bad: Promise<never> = AsyncResult.from(async () => AsyncResult.reject('ERROR' as const));
    const better: AsyncResult<never, "ERROR"> = AsyncResult.from(() => AsyncResult.reject('ERROR' as const));
    ```

## Type Definition

```typescript
type Fn<I, O> = (arg: I) => O;
type InferValue<T> = Awaited<T>;
type InferError<T> = T extends AsyncResult<any, infer E> ? InferValue<E> : never;

export declare class AsyncResult<V, E> implements PromiseLike<V> {
    
  private readonly promise;
  
  constructor(fn: (resolve: Fn<V, void>, reject: Fn<E, void>) => void);
  
  static NEVER: AsyncResult<never, never>;
  static EMPTY: AsyncResult<void, never>;
  static resolve<V>(value: V): AsyncResult<InferValue<V>, never>;
  static reject<E>(error: E): AsyncResult<never, E>;
  static from<T>(data: T | Fn<void, T>): AsyncResult<InferValue<T>, InferError<T>>;
  static all<T extends readonly unknown[] | [] | Record<string, any>>(data: T): AsyncResult<{
      -readonly [P in keyof T]: InferValue<T[P]>;
  }, InferError<T[keyof T]>>;
  
  toPromise(): Promise<V>;
  
  then<Out>(onfulfilled: Fn<V, Out>): AsyncResult<InferValue<Out>, InferError<Out>>;
  then<Out, Out2>(onfulfilled: Fn<V, Out>, onrejected: Fn<E, Out2>): AsyncResult<InferValue<Out> | InferValue<Out2>, InferError<Out> | InferError<Out2>>;
  catch<Out>(fn: Fn<E, Out>): AsyncResult<V | InferValue<Out>, InferError<Out>>;
  
  flatten(): AsyncResult<Awaited<Awaited<V>> | Awaited<Awaited<E>>, never>;
  swap(): AsyncResult<Awaited<Awaited<E>>, Awaited<V>>;
  pair(): AsyncResult<(V extends never ? never : [V, undefined]) | (E extends never ? never : [undefined, E]), never>;
  guard<V2 extends V, E2>(fn: (val: V) => val is V2, on_false: E2 | Fn<V, E2>): AsyncResult<V2, E | E2>;
  guard<V2, E2>(fn: (val: any) => val is V2, on_false: E2 | Fn<V, E2>): AsyncResult<V2, E | E2>;
  guard<E2>(fn: Fn<V, boolean>, on_false: E2 | Fn<V, E2>): AsyncResult<V, E | E2>;
  mapErr<E2>(fn: Fn<E, E2>): AsyncResult<V, Awaited<E2>>;
  tap(fn: Fn<V, any>): AsyncResult<V, E>;
  tapErr(fn: Fn<E, void | Promise<void>>): AsyncResult<V, E>;
  fallback<V2>(value: V2): AsyncResult<V | V2, never>;
  
  pipe(): AsyncResult<V, E>;
  pipe<O1>(f1: Fn<InferValue<V>, O1>): AsyncResult<InferValue<O1>, E | InferError<O1>>;
  pipe<O1, O2>(f1: Fn<InferValue<V>, O1>, f2: Fn<InferValue<O1>, O2>): AsyncResult<InferValue<O2>, E | InferError<O1 | O2>>;
  pipe<O1, O2, O3>(f1: Fn<InferValue<V>, O1>, f2: Fn<InferValue<O1>, O2>, f3: Fn<InferValue<O2>, O3>): AsyncResult<InferValue<O3>, E | InferError<O1 | O2 | O3>>;
  pipe<O1, O2, O3, O4>(f1: Fn<InferValue<V>, O1>, f2: Fn<InferValue<O1>, O2>, f3: Fn<InferValue<O2>, O3>, f4: Fn<InferValue<O3>, O4>): AsyncResult<InferValue<O4>, E | InferError<O1 | O2 | O3 | O4>>;
  pipe<O1, O2, O3, O4, O5>(f1: Fn<InferValue<V>, O1>, f2: Fn<InferValue<O1>, O2>, f3: Fn<InferValue<O2>, O3>, f4: Fn<InferValue<O3>, O4>, f5: Fn<InferValue<O4>, O5>): AsyncResult<InferValue<O5>, E | InferError<O1 | O2 | O3 | O4 | O5>>;
  pipe<O1, O2, O3, O4, O5, O6>(f1: Fn<InferValue<V>, O1>, f2: Fn<InferValue<O1>, O2>, f3: Fn<InferValue<O2>, O3>, f4: Fn<InferValue<O3>, O4>, f5: Fn<InferValue<O4>, O5>, f6: Fn<InferValue<O5>, O6>): AsyncResult<InferValue<O6>, E | InferError<O1 | O2 | O3 | O4 | O5 | O6>>;
  pipe<O1, O2, O3, O4, O5, O6, O7>(f1: Fn<InferValue<V>, O1>, f2: Fn<InferValue<O1>, O2>, f3: Fn<InferValue<O2>, O3>, f4: Fn<InferValue<O3>, O4>, f5: Fn<InferValue<O4>, O5>, f6: Fn<InferValue<O5>, O6>, f7: Fn<InferValue<O6>, O7>): AsyncResult<InferValue<O7>, E | InferError<O1 | O2 | O3 | O4 | O5 | O6 | O7>>;
  pipe<O1, O2, O3, O4, O5, O6, O7, O8>(f1: Fn<InferValue<V>, O1>, f2: Fn<InferValue<O1>, O2>, f3: Fn<InferValue<O2>, O3>, f4: Fn<InferValue<O3>, O4>, f5: Fn<InferValue<O4>, O5>, f6: Fn<InferValue<O5>, O6>, f7: Fn<InferValue<O6>, O7>, f8: Fn<InferValue<O7>, O8>): AsyncResult<InferValue<O8>, E | InferError<O1 | O2 | O3 | O4 | O5 | O6 | O7 | O8>>;
  pipe<O1, O2, O3, O4, O5, O6, O7, O8, O9>(f1: Fn<InferValue<V>, O1>, f2: Fn<InferValue<O1>, O2>, f3: Fn<InferValue<O2>, O3>, f4: Fn<InferValue<O3>, O4>, f5: Fn<InferValue<O4>, O5>, f6: Fn<InferValue<O5>, O6>, f7: Fn<InferValue<O6>, O7>, f8: Fn<InferValue<O7>, O8>, f9: Fn<InferValue<O8>, O9>): AsyncResult<InferValue<O9>, E | InferError<O1 | O2 | O3 | O4 | O5 | O6 | O7 | O8 | O9>>;
  pipe<O1, O2, O3, O4, O5, O6, O7, O8, O9, O10>(f1: Fn<InferValue<V>, O1>, f2: Fn<InferValue<O1>, O2>, f3: Fn<InferValue<O2>, O3>, f4: Fn<InferValue<O3>, O4>, f5: Fn<InferValue<O4>, O5>, f6: Fn<InferValue<O5>, O6>, f7: Fn<InferValue<O6>, O7>, f8: Fn<InferValue<O7>, O8>, f9: Fn<InferValue<O8>, O9>, f10: Fn<InferValue<O9>, O10>): AsyncResult<InferValue<O10>, E | InferError<O1 | O2 | O3 | O4 | O5 | O6 | O7 | O8 | O9 | O10>>;
}
```
