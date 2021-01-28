import { Nullable, Handle, Storage } from "./storage";

class BHPQHandle<T> implements Handle<T> {
  value: T;
  index: number;
  constructor(value: T, index: number) {
    this.value = value;
    this.index = index;
  }
}

/**
 * A heap implemented as an array of elements where a node at index
 * i has children at indexes 2*i+1 and 2*i+2
 */
export class BinHeapStorage<T> extends Storage<T> {
  private handles: Nullable<BHPQHandle<T>>[] = [];
  private count = 0;
  private emptyIndexes: number[] = [];

  /**
   * Get the number of elements in this PQ.
   */
  get size(): number {
    return this.count;
  }

  /**
   * Tells if the storage is empty.
   */
  get isEmpty(): boolean {
    return this.count == 0;
  }

  /**
   * Clears all elements from this Storage.
   */
  clear(): void {
    this.handles = [];
    this.emptyIndexes = [];
    this.count = 0;
  }

  /**
   * If a value's priority changes, this method can be called to
   * adjust its position within the storage based on its new
   * priority.
   */
  adjust(handle: BHPQHandle<T>): void {
    // Try moving it up heap if required
    let curr = handle.index;
    if (this.upheap(curr) == curr) {
      // nothing happened, then try down heaping it
      const size = this.handles.length;
      curr = handle.index;
      while (curr < size) {
        const left = 2 * curr + 1;
        const right = 2 * curr + 2;
        const leftPtr = left >= size ? null : this.handles[left];
        const rightPtr = right >= size ? null : this.handles[right];
        if (leftPtr == null && rightPtr == null)
          // we are in the right spot
          return;

        let smaller = -1;
        if (leftPtr == null && rightPtr != null) {
          smaller = right;
        } else if (rightPtr == null && leftPtr != null) {
          smaller = left;
        } else if (this.comparator(leftPtr!.value, rightPtr!.value) < 0) {
          smaller = left;
        } else {
          smaller = right;
        }

        // See we are smaller than the "smaller" child, if not, swap with it
        if (this.comparator(handle.value, this.handles[smaller]!.value) < 0)
          // We are smaller than the smaller child so we are in right spot
          return;

        // otherwise swap
        this.handles[curr] = this.handles[smaller];
        this.handles[curr]!.index = curr;
        this.handles[smaller] = handle;
        this.handles[smaller]!.index = smaller;
        curr = smaller;
      }
    }
  }

  /**
   * Returns the top most element in this storage.
   */
  get top(): BHPQHandle<T> {
    if (this.handles[0] == null) {
      throw new Error("Storage is empty");
    }
    return this.handles[0];
  }

  /**
   * Pushes a new value into the storage and return its handle back
   */
  push(value: T) {
    const handle = new BHPQHandle(value, this.count);
    this.count++;
    if (this.emptyIndexes.length > 0) {
      const i = this.emptyIndexes.pop() as number;
      handle.index = i;
      this.handles[i] = handle;
    } else {
      // we are saturated so add to end and upheap
      this.handles.push(handle);

      // And extend with more empty space at the end so we can
      // ammortize push speeds
      const newlen = this.count;
      const newcapacity = (newlen * 3) >> 1;
      const spare = Math.max(8, newcapacity - newlen);
      for (let i = 0; i < spare; i++) {
        this.handles.push(null);
        this.emptyIndexes.push(newlen + spare - 1 - i);
      }
    }
    // So handle is at a given point, so upheap from there
    this.upheap(handle.index);
    return handle;
  }

  /**
   * Pops the top most value out of the Storage
   */
  pop() {
    if (this.handles[0] == null) {
      throw new Error("Storage is empty");
    }
    return this.remove(this.handles[0]);
  }

  /**
   * Removes an element given its handle.
   */
  remove(handle: BHPQHandle<T>) {
    const size = this.handles.length;
    let curr = handle.index;
    while (curr < size) {
      const left = 2 * curr + 1;
      const right = 2 * curr + 2;
      const leftPtr = left >= size ? null : this.handles[left];
      const rightPtr = right >= size ? null : this.handles[right];
      let which = -1;
      if (leftPtr == null && rightPtr != null) {
        which = right;
      } else if (rightPtr == null && leftPtr != null) {
        which = left;
      } else if (leftPtr == null && rightPtr == null) {
        break;
      } else {
        if (this.comparator(leftPtr!.value, rightPtr!.value) < 0) which = left;
        else which = right;
      }
      this.handles[curr] = this.handles[which];
      this.handles[curr]!.index = curr;
      this.handles[which] = handle;
      this.handles[which]!.index = which;
      curr = which;
    }
    this.count--;
    this.handles[handle.index] = null;
    this.releaseIndex(handle.index);
    return handle;
  }

  /**
   * Get all handles within this storage.
   */
  get sortedHandles() {
    const out = this.handles.filter((x) => x != null) as BHPQHandle<T>[];
    const cmpFunc = this.comparator;
    out.sort((x, y) => cmpFunc(x.value, y.value));
    return out.values();
  }

  upheap(curr: number): number {
    const start = curr;
    let parentIsEmpty = false;
    while (curr > 0) {
      const parent = (curr - 1) >> 1;
      const parentHandle = this.handles[parent];
      parentIsEmpty = parentHandle == null;
      if (parentHandle != null) {
        if (this.comparator(parentHandle.value, this.handles[curr]!.value) <= 0) break;
        parentHandle.index = curr;
      }

      // swap the entries
      this.handles[curr]!.index = parent;
      const temp = this.handles[parent];
      this.handles[parent] = this.handles[curr];
      this.handles[curr] = temp;
      curr = parent;
    }

    if (parentIsEmpty) this.releaseIndex(start);

    return curr;
  }

  releaseIndex(index: number) {
    const A = this.emptyIndexes;
    let lo = 0;
    let hi = A.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (A[mid] == index) {
        throw new Error(`A[${mid}] (${A[mid]}) should not be equal to index (${index})`);
      }
      if (index < A[mid]) {
        // go to right half
        lo = mid + 1;
      } else {
        // go to left half
        hi = mid - 1;
      }
    }
    A.splice(lo, 0, index);
  }
}
