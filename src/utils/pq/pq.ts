import { Comparator, Handle, Storage } from "./storage";
import { BinHeapStorage } from "./binheap";

type KeyType = string | number;
type KeyFunc<T> = (value: T) => KeyType;
function idKeyFunc<T>(x: T) {
  return (x as any) as KeyType;
}

export class PQ<T> {
  keyFunc: KeyFunc<T>;
  storage: Storage<T>;
  handlesByValue = new Map<KeyType, [Handle<T>, number]>();

  constructor(comparatorOrStorage: Comparator<T> | Storage<T>, keyFunc: KeyFunc<T> = idKeyFunc) {
    this.keyFunc = keyFunc;
    if ("heapify" in comparatorOrStorage) {
      this.storage = comparatorOrStorage as Storage<T>;
    } else {
      // create a default Storage with our comparator
      const comparator = comparatorOrStorage as Comparator<T>;
      this.storage = new BinHeapStorage(comparator);
    }
  }

  /**
   * Returns a handle to the minimum (top) value.
   */
  get top() {
    return this.storage.top;
  }

  pop(): T | null {
    const handle = this.storage.pop();
    // if (handle == null) return null;
    const key = this.keyFunc(handle.value);
    const handleEntry = this.handlesByValue.get(key) || null;
    if (handleEntry == null) return null;
    if (handleEntry[1] == 1) {
      this.handlesByValue.delete(key);
    } else {
      handleEntry[1]--;
    }
    return handle.value;
  }

  /**
   * Pushes a new value onto the PQ.
   * If the value already exists, then the value is only added again
   * to the storage if the duplicates flag is set to False.
   *
   * Returns a handle to the value within the PQ.
   */
  push(value: T) {
    const key = this.keyFunc(value);
    let handleEntry = this.handlesByValue.get(key) || null;
    if (handleEntry == null) {
      const handle = this.storage.push(value);
      handleEntry = [handle, 0];
      this.handlesByValue.set(key, handleEntry);
    }
    handleEntry[1]++;
    return handleEntry[0];
  }

  heapify(values: IterableIterator<T>) {
    for (const value of values) {
      this.push(value);
    }
  }

  adjustValue(value: T) {
    const handle = this.find(value);
    if (handle == null) {
      this.push(value);
    } else {
      this.adjust(handle);
    }
  }

  /**
   * Called to reevaluate the position of an entry given its handle within
   * the heap.
   *
   * This is usually called after an entry has been modified such that
   * its position in the heap would have changed (due to a change in
   * its priority).
   */
  adjust(handle: Handle<T>) {
    this.storage.adjust(handle);
  }

  removeValue(value: T) {
    const handle = this.find(value);
    if (handle != null) {
      this.remove(handle);
    }
  }

  /**
   * Removes a value given its handle from the PQ.
   * If a handle is passed instead of a value then only the value
   * referred by the handle is removed (regardless of other duplicates).
   * To remove all instances of a value from the PQ, pass the value
   * instead.
   */
  remove(handle: Handle<T>) {
    const key = this.keyFunc(handle.value);
    const handleEntry = this.handlesByValue.get(key) || [null, -1];
    const [foundHandle, count] = handleEntry;
    if (foundHandle != null) {
      if (count > 1) {
        handleEntry[1]--;
      } else {
        this.storage.remove(foundHandle);
        this.handlesByValue.delete(key);
      }
    }
  }

  /**
   * Returns a handle to the first instance of a particular value.
   */
  findByKey(key: KeyType): Handle<T> | null {
    const [handle, _] = this.handlesByValue.get(key) || [null, -1];
    return handle;
  }

  /**
   * Returns a handle to the first instance of a particular value.
   */
  find(value: T): Handle<T> | null {
    const key = this.keyFunc(value);
    return this.findByKey(key);
  }

  get size() {
    return this.storage.size;
  }

  get isEmpty() {
    return this.storage.isEmpty;
  }

  clear() {
    this.storage.clear();
    this.handlesByValue = new Map<KeyType, [Handle<T>, number]>();
  }
}
