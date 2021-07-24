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
});
