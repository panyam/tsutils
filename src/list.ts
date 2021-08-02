import { Nullable } from "./types";

export interface ListNode<V> {
  parentNode: any;
  nextNode: Nullable<V>;
  prevNode: Nullable<V>;
}

class MutableListNode<V> implements ListNode<MutableListNode<V>> {
  parentNode: any;
  nextNode: Nullable<MutableListNode<V>> = null;
  prevNode: Nullable<MutableListNode<V>> = null;
  constructor(public value: V) {}
}

/**
 * A list implementation where the value itself contains next, prev and parent pointers
 * so we do not need to create wrapper classes.
 */
export class ValueList<V extends ListNode<V>> {
  protected _firstChild: Nullable<V> = null;
  protected _lastChild: Nullable<V> = null;
  protected _size = 0;

  constructor(...values: V[]) {
    for (const v of values) this.push(v);
  }

  toJSON(): V[] {
    return Array.from(this.values());
  }

  forEach(method: (val: V) => boolean | any): number {
    let tmp: V | null = this._firstChild;
    let count = 0;
    while (tmp != null) {
      if (method(tmp) == false) {
        break;
      }
      count++;
      tmp = tmp.nextNode;
    }
    return count;
  }

  equals(another: ValueList<V>, eqlFunc: (val1: V, val2: V) => boolean): boolean {
    if (this.size != another.size) return false;
    let tmp = this.first;
    let tmp2 = another.first;
    for (; tmp != null && tmp2 != null; tmp = tmp.nextNode, tmp2 = tmp2.nextNode) {
      if (!eqlFunc(tmp, tmp2)) {
        return false;
      }
    }
    return tmp == null && tmp2 == null;
  }

  get isEmpty(): boolean {
    return this._size == 0;
  }

  get size(): number {
    return this._size;
  }

  get first(): Nullable<V> {
    return this._firstChild;
  }

  get last(): Nullable<V> {
    return this._lastChild;
  }

  /**
   * Generator of values in reverse order.
   */
  *reversedValues(): Generator<V> {
    let tmp = this._lastChild;
    while (tmp != null) {
      yield tmp;
      tmp = tmp.prevNode;
    }
  }

  /**
   * Generator of values in forward order.
   */
  *values(): Generator<V> {
    let tmp = this._firstChild;
    while (tmp != null) {
      yield tmp;
      tmp = tmp.nextNode;
    }
  }

  popBack(): V {
    if (this._lastChild == null) {
      throw new Error("No children");
    }
    const out = this._lastChild;
    const prev = this._lastChild.prevNode;
    this._size--;
    if (prev == null) {
      this._firstChild = this._lastChild = null;
    } else {
      prev.nextNode = null;
      this._lastChild = prev;
    }
    return out;
  }

  popFront(): V {
    if (this._firstChild == null) {
      throw new Error("No children");
    }
    const out = this._firstChild;
    const next = this._firstChild.nextNode;
    this._size--;
    if (next == null) {
      this._firstChild = this._lastChild = null;
    } else {
      next.prevNode = null;
      this._firstChild = next;
    }
    return out;
  }

  add(child: V, before: Nullable<V> = null): this {
    if (child.parentNode) {
      throw new Error("Child has a parent.  Remove it first");
    }
    if (before && before.parentNode != this) {
      throw new Error("Node to add before is not a child of this");
    }
    child.parentNode = this;
    this._size++;
    if (this._firstChild == null || this._lastChild == null) {
      this._firstChild = this._lastChild = child;
    } else if (before == null) {
      child.prevNode = this._lastChild;
      child.nextNode = null;
      this._lastChild.nextNode = child;
      this._lastChild = child;
    } else if (before == this._firstChild) {
      child.nextNode = before;
      child.prevNode = null;
      this._firstChild.prevNode = child;
      this._firstChild = child;
    } else {
      const next = before.nextNode;
      const prev = before.prevNode;
      child.nextNode = next;
      child.prevNode = prev;
      if (next != null) {
        next.prevNode = child;
      }
      if (prev != null) {
        prev.nextNode = child;
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

/**
 * A list implementation where the value itself contains next, prev and parent pointers
 * so we do not need to create wrapper classes.
 */
export class List<V> {
  private container: ValueList<MutableListNode<V>>;

  constructor(...values: V[]) {
    this.container = new ValueList<MutableListNode<V>>();
    for (const v of values) this.push(v);
  }

  toJSON(): V[] {
    return Array.from(this.values());
  }

  forEach(method: (val: V) => boolean | any): number {
    return this.container.forEach((v) => method(v.value));
  }

  equals(another: List<V>, eqlFunc: (val1: V, val2: V) => boolean): boolean {
    return this.container.equals(another.container, (a, b) => eqlFunc(a.value, b.value));
  }

  get isEmpty(): boolean {
    return this.container.isEmpty;
  }

  get size(): number {
    return this.container.size;
  }

  get first(): Nullable<MutableListNode<V>> {
    return this.container.first;
  }

  get last(): Nullable<MutableListNode<V>> {
    return this.container.last;
  }

  /**
   * Generator of values in reverse order.
   */
  *reversedValues(): Generator<V> {
    for (const v of this.container.reversedValues()) yield v.value;
  }

  /**
   * Generator of values in forward order.
   */
  *values(): Generator<V> {
    for (const v of this.container.values()) yield v.value;
  }

  popBack(): V {
    return this.container.popBack().value;
  }

  popFront(): V {
    return this.container.popFront().value;
  }

  pushFront(value: V): this {
    return this.add(value, this.container.first);
  }

  push(value: V): this {
    return this.add(value);
  }

  add(child: V, before: Nullable<MutableListNode<V>> = null): this {
    this.container.add(new MutableListNode(child), before);
    return this;
  }
}
