export function* streamArray<V>(arr: ReadonlyArray<V>): Generator<[number, V]> {
  for (let i = 0; i < arr.length; i++) {
    yield [i, arr[i] as V];
  }
}

export function* streamDict<K extends string | number, V>(dict: any): Generator<[K, V]> {
  for (const key in dict) {
    yield [key as K, dict[key] as V];
  }
}

export function* mapStream<X, Y>(stream: Generator<X>, mapper: (x: X, index?: number) => Y): Generator<Y> {
  let i = 0;
  for (let next = stream.next(); !next.done; next = stream.next()) {
    yield mapper(next.value, i);
    i++;
  }
}

export function* filterStream<X>(stream: Generator<X>, filterFunc?: (x: X, index?: number) => boolean): Generator<X> {
  let i = 0;
  for (let next = stream.next(); !next.done; next = stream.next()) {
    if (filterFunc) {
      if (filterFunc(next.value, i)) {
        yield next.value;
      }
    } else if (next.value) {
      yield next.value;
    }
    i++;
  }
}

export function collectStream<X, Y>(
  stream: Generator<X>,
  collector: (x: X, y: Y, index?: number) => Y,
  collection: Y,
): Y {
  let i = 0;
  for (let next = stream.next(); !next.done; next = stream.next()) {
    collection = collector(next.value, collection, i);
    i++;
  }
  return collection;
}
