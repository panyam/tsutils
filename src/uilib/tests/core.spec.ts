import { Size, Rect, Insets } from "../core";

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
});

describe("View Tests", () => {
  test("Creation", () => {
    //
  });
});
