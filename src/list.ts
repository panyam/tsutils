import { Nullable } from "./types";

export interface ListNode<V> {
  readonly parent: List<V>;
  readonly value: V;
  readonly next: Nullable<MutableListNode<V>>;
  readonly prev: Nullable<MutableListNode<V>>;
}

class MutableListNode<V> implements ListNode<V> {
  readonly value: V;
  parent: List<V>;
  next: Nullable<MutableListNode<V>> = null;
  prev: Nullable<MutableListNode<V>> = null;
  constructor(value: V) {
    this.value = value;
  }
}

export class List<V> {
  protected _firstChild: Nullable<MutableListNode<V>> = null;
  protected _lastChild: Nullable<MutableListNode<V>> = null;
  protected _size = 0;

  forEach(method: (val: V) => boolean | any): number {
    let tmp = this._firstChild;
    let count = 0;
    while (tmp != null) {
      if (method(tmp.value) == false) {
        break;
      }
      count++;
      tmp = tmp.next;
    }
    return count;
  }

  equals(another: List<V>, eqlFunc: (val1: V, val2: V) => boolean): boolean {
    if (this.size != another.size) return false;
    for (let tmp = this.first, tmp2 = another.first; tmp != null && tmp2 != null; tmp = tmp.next, tmp2 = tmp2.next) {
      if (!eqlFunc(tmp.value, tmp2.value)) {
        return false;
      }
    }
    return true;
  }

  get isEmpty(): boolean {
    return this._size == 0;
  }

  get size(): number {
    return this._size;
  }

  get first(): Nullable<ListNode<V>> {
    return this._firstChild;
  }

  get last(): Nullable<ListNode<V>> {
    return this._lastChild;
  }

  /** Helpers to iterate children in forward or reverse direction. */
  *values(reverse = false): Generator<V> {
    if (reverse) {
      let tmp = this._lastChild;
      while (tmp != null) {
        yield tmp.value;
        tmp = tmp.prev;
      }
    } else {
      let tmp = this._firstChild;
      while (tmp != null) {
        yield tmp.value;
        tmp = tmp.next;
      }
    }
  }

  popBack(): V {
    if (this._lastChild == null) {
      throw new Error("No children");
    }
    const out = this._lastChild;
    const prev = this._lastChild.prev;
    this._size--;
    if (prev == null) {
      this._firstChild = this._lastChild = null;
    } else {
      prev.next = null;
      this._lastChild = prev;
    }
    return out.value;
  }

  popFront(): V {
    if (this._firstChild == null) {
      throw new Error("No children");
    }
    const out = this._firstChild;
    const next = this._firstChild.next;
    this._size--;
    if (next == null) {
      this._firstChild = this._lastChild = null;
    } else {
      next.prev = null;
      this._firstChild = next;
    }
    return out.value;
  }

  add(value: V, before: Nullable<ListNode<V>> = null): this {
    const child = new MutableListNode<V>(value);
    /*
    if (child.parent) {
      throw new Error("Child has a parent.  Remove it first");
    }
    */
    if (before && before.parent != this) {
      throw new Error("Node to add before is not a child of this");
    }
    child.parent = this;
    this._size++;
    if (this._firstChild == null || this._lastChild == null) {
      this._firstChild = this._lastChild = child;
    } else if (before == null) {
      child.prev = this._lastChild;
      child.next = null;
      this._lastChild.next = child;
      this._lastChild = child;
    } else if (before == this._firstChild) {
      child.next = before;
      child.prev = null;
      this._firstChild.prev = child;
      this._firstChild = child;
    } else {
      const next = before.next;
      const prev = before.prev;
      child.next = next;
      child.prev = prev;
      if (next != null) {
        next.prev = child;
      }
      if (prev != null) {
        prev.next = child;
      }
    }
    return this;
  }

  pushFront(value: V): this {
    return this.add(value, this._firstChild);
  }

  push(value: V): this {
    return this.add(value);
  }
}
