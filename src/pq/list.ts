import { Handle, Storage } from "./storage";

class ListPQHandle<T> implements Handle<T> {
  value: T;
  index: number;
  constructor(value: T, index: number) {
    this.value = value;
    this.index = index;
  }
}

export class ListStorage<T> extends Storage<T> {
  private handles: ListPQHandle<T>[] = [];

  /**
   * Get the number of elements in this PQ.
   */
  get size(): number {
    return this.handles.length;
  }

  /**
   * Clears all elements from this Storage.
   */
  clear(): void {
    this.handles = [];
  }

  /**
   * If a value's priority changes, this method can be called to
   * adjust its position within the storage based on its new
   * priority.
   */
  adjust(_handle: ListPQHandle<T>): void {
    // Does nothing as list is never sorted
  }

  /**
   * Tells if the storage is empty.
   */
  get isEmpty(): boolean {
    return this.handles.length == 0;
  }

  /**
   * Returns the top most element in this storage.
   */
  get top(): ListPQHandle<T> {
    const [_, handle] = this.minIndex;
    return handle;
  }

  /**
   * Pushes a new value into the storage and return its handle back
   */
  push(value: T) {
    const handle = new ListPQHandle<T>(value, this.handles.length);
    this.handles.push(handle);
    return handle;
  }

  /**
   * Pops the top most value out of the Storage
   */
  pop() {
    const [_, handle] = this.minIndex;
    // if (handle == null) return null;
    return this.remove(handle as ListPQHandle<T>);
  }

  /**
   * Removes an element given its handle.
   */
  remove(handle: ListPQHandle<T>) {
    const index = handle.index;
    this.handles.splice(index, 1);
    for (let i = index; i < this.handles.length; i++) {
      this.handles[i].index = i;
    }
    return handle;
  }

  /**
   * Get all handles within this storage.
   */
  get sortedHandles() {
    const out = [...this.handles];
    const cmpFunc = this.comparator;
    out.sort((x, y) => cmpFunc(x.value, y.value));
    return out.values();
  }

  get minIndex(): [number, ListPQHandle<T>] {
    if (this.isEmpty) {
      throw new Error("Storage is empty.");
    }
    let index = -1;
    let handle: ListPQHandle<T>;
    for (let i = 0; i < this.handles.length; i++) {
      const h = this.handles[i];
      if (index < 0 || this.comparator(h.value, handle!.value) < 0) {
        index = i;
        handle = h;
      }
    }
    return [index, handle!];
  }
}
