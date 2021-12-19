import * as L from "../list";

describe("LinkedList tests", () => {
  test("Create List and basic Accessors", () => {
    const l1 = new L.List(1, 2, 3, 4, 5);
    expect(l1.toJSON()).toEqual([1, 2, 3, 4, 5]);
    expect(l1.size).toEqual(5);
    expect(l1.isEmpty).toEqual(false);
    expect(l1.first?.value).toEqual(1);
    expect(l1.last?.value).toEqual(5);

    expect(Array.from(new L.List(1, 2, 3, 4, 5).reversedValues())).toEqual([5, 4, 3, 2, 1]);
  });

  test("Test pops", () => {
    const l1 = new L.List(1, 2, 3, 4, 5);
    expect(l1.popFront()).toEqual(1);
    expect(l1.popBack()).toEqual(5);
    expect(l1.size).toEqual(3);
    expect(() => new L.List().popFront()).toThrowError();
    expect(() => new L.List().popBack()).toThrowError();

    const l2 = new L.List(1);
    expect(l2.popBack()).toEqual(1);
    expect(l2.first).toBe(null);
    expect(l2.last).toBe(null);

    const l3 = new L.List(1);
    expect(l3.popFront()).toEqual(1);
    expect(l3.first).toBe(null);
    expect(l3.last).toBe(null);
  });

  test("Test forEach", () => {
    const out = [] as any;
    const out2 = [] as any;
    const l1 = new L.List(1, 2, 3, 4, 5);
    l1.forEach((v) => out.push(v * 2));
    expect(out).toEqual([2, 4, 6, 8, 10]);

    l1.forEach((v) => {
      if (v > 3) return false;
      out2.push(v * 2);
    });
    expect(out2).toEqual([2, 4, 6]);
  });

  test("Test List Equals", () => {
    const l1 = new L.List(1, 2, 3, 4, 5);
    const l2 = new L.List(1, 2, 3, 4, 5);
    const l3 = new L.List(1, 2, 3, 7, 5);
    expect(l1.equals(l2, (a, b) => a == b)).toBe(true);
    expect(l1.equals(l3, (a, b) => a == b)).toBe(false);
  });

  test("Additions", () => {
    class Value {
      nextSibling: Value;
      prevSibling: Value;
      constructor(public value: number) {}
    }

    const v1 = new Value(1);
    const v2 = new Value(2);
    const v3 = new Value(3);
    const v4 = new Value(4);
    const v5 = new Value(5);
    const l = new L.ValueList<Value>();
    l.add(v1);
    expect(v1.prevSibling).toBe(null);
    expect(v1.nextSibling).toBe(null);
    expect(l.size).toBe(1);

    // push front
    l.pushFront(v2);
    expect(l.size).toBe(2);
    expect(v2.prevSibling).toBe(null);
    expect(v2.nextSibling).toBe(v1);
    expect(v1.prevSibling).toBe(v2);
    expect(v1.nextSibling).toBe(null);

    // Adding pre existing
    expect(() => l.add(v1)).toThrowError();

    // push in middle
    l.add(v3, v1);
    expect(l.size).toBe(3);
    expect(v2.prevSibling).toBe(null);
    expect(v2.nextSibling).toBe(v3);
    expect(v3.prevSibling).toBe(v2);
    expect(v3.nextSibling).toBe(v1);
    expect(v1.prevSibling).toBe(v3);
    expect(v1.nextSibling).toBe(null);
  });

  test("Removal", () => {
    class Value {
      nextSibling: Value;
      prevSibling: Value;
      constructor(public value: number) {}
    }

    const v1 = new Value(1);
    const v2 = new Value(2);
    const v3 = new Value(3);
    const v4 = new Value(4);
    const v5 = new Value(5);
    const l = new L.ValueList<Value>(v1, v2, v3, v4, v5);
    expect(l.size).toBe(5);
    expect(l.first).toBe(v1);
    expect(l.last).toBe(v5);
    expect(v3.prevSibling).toBe(v2);
    expect(v3.nextSibling).toBe(v4);
    l.remove(v3);
    expect(v2.nextSibling).toBe(v4);
    expect(v4.prevSibling).toBe(v2);
    expect(v3.prevSibling).toBe(null);
    expect(v3.nextSibling).toBe(null);
    expect(l.size).toBe(4);

    expect(v2.prevSibling).toBe(v1);
    expect(v1.nextSibling).toBe(v2);
    expect(v1.prevSibling).toBe(null);
    l.remove(v1);
    expect(l.size).toBe(3);
    expect(l.first).toBe(v2);
    expect(l.last).toBe(v5);
    expect(v1.prevSibling).toBe(null);
    expect(v1.nextSibling).toBe(null);
    expect(v2.prevSibling).toBe(null);

    // remove from last
    l.remove(v5);
    expect(l.size).toBe(2);
    expect(l.last).toBe(v4);
    expect(v5.prevSibling).toBe(null);
    expect(v5.nextSibling).toBe(null);
    expect(v4.nextSibling).toBe(null);
  });
});
