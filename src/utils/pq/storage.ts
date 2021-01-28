export type Comparator<T> = (value1: T, value2: T) => number;
export type Nullable<T> = T | null;

export interface Handle<T = any> {
  value: T;
}

export abstract class Storage<T> {
  private _cmpFunc: Comparator<T>;
  constructor(cmpFunc: Comparator<T>) {
    this._cmpFunc = cmpFunc;
  }

  /**
   * Heapifies a collection of values onto this PQ
   */
  heapify(values: IterableIterator<T>) {
    for (const value of values) {
      this.push(value);
    }
  }

  get comparator(): Comparator<T> {
    return this._cmpFunc;
  }

  set comparator(cmpFunc: Comparator<T>) {
    this._cmpFunc = cmpFunc;
    const handles = this.sortedHandles;
    this.clear();
    for (const handle of handles) {
      this.push(handle.value);
    }
  }

  /**
   * Get the number of elements in this PQ.
   */
  abstract get size(): number;

  /**
   * Clears all elements from this Storage.
   */
  abstract clear(): void;

  /**
   * If a value's priority changes, this method can be called to
   * adjust its position within the storage based on its new
   * priority.
   */
  adjust(_handle: Handle<T>) {
    // do nothing
  }

  /**
   * Get all handles within this storage in sorted order.
   */
  abstract get sortedHandles(): IterableIterator<Handle<T>>;

  /**
   * Tells if the storage is empty.
   */
  abstract get isEmpty(): boolean;

  /**
   * Returns the top most element in this storage.
   */
  abstract get top(): Handle<T>;

  /**
   * Pops the top most value out of the Storage
   */
  abstract pop(): Handle<T>;

  /**
   * Pushes a new value into the storage and return its handle back
   */
  abstract push(value: T): Handle<T>;

  /**
   * Removes an element given its handle.
   */
  abstract remove(handle: Handle<T>): Handle<T>;
}
