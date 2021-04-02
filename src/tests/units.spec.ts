import { Duration } from "../timeutils";

describe("Duration Tests", () => {
  test("Default duration is ms", () => {
    expect(Duration("4ms")).toBe(4);
    expect(Duration("4ms", "ms")).toBe(4);
    expect(Duration("4ms", "mus")).toBe(4000);
    expect(Duration("4ms", "ns")).toBe(4000000);
    expect(Duration("4ms", "tacos")).toBe(null);
  });
});
