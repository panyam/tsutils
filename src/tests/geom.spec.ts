import { Size, Rect, Insets } from "../geom";

describe("Basic Tests", () => {
  test("Size Creation", () => {
    const s = new Size(50, 100);
    expect(s.width).toBe(50);
    expect(s.height).toBe(100);
  });

  test("Rect Creation", () => {
    const r = new Rect(10, 20, 50, 100);
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
    expect(r.width).toBe(50);
    expect(r.height).toBe(100);
  });

  test("Insets Creation", () => {
    const i = new Insets(10, 20, 30, 40);
    expect(i.left).toBe(10);
    expect(i.top).toBe(20);
    expect(i.right).toBe(30);
    expect(i.bottom).toBe(40);
  });

  test("Rect Unions", () => {
    const r1 = new Rect(50, 50, 100, 100);
    const r2 = new Rect(75, 75, 20, 20);
    const r3 = new Rect(10, 60, 300, 50);
    let r4 = r1.copy();
    r4 = r4.union(r1);
    r4 = r4.union(r2);
    r4 = r4.union(r3);
    expect(r4.x).toEqual(10);
    expect(r4.y).toEqual(50);
    expect(r4.width).toEqual(300);
    expect(r4.height).toEqual(100);
  });
});
