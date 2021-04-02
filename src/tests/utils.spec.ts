import { gcdof, Frac, Fraction, range } from "../numberutils";

describe("Range Tests", () => {
  test("Simple Range", () => {
    expect(range(5)).toEqual([0, 1, 2, 3, 4]);
  });
  test("Simple -ve Range", () => {
    expect(range(-5)).toEqual([-4, -3, -2, -1, 0]);
  });
  test("A->B Incr +ve Range", () => {
    expect(range(2, 4)).toEqual([2, 3, 4]);
  });
  test("A->B Decr +ve Range", () => {
    expect(range(4, 2)).toEqual([4, 3, 2]);
  });
  test("A->B Incr -ve Range", () => {
    expect(range(-5, -3)).toEqual([-5, -4, -3]);
  });
  test("A->B Decr -ve Range", () => {
    expect(range(-3, -5)).toEqual([-3, -4, -5]);
  });
});

describe("GCD Tests", () => {
  test("Basic", () => {
    expect(gcdof(0, 3)).toEqual(3);
    expect(gcdof(2, 3)).toEqual(1);
    expect(gcdof(32, 64)).toEqual(32);
    expect(gcdof(64, 32)).toEqual(32);
    expect(gcdof(49, 56)).toEqual(7);
    expect(gcdof(56, 49)).toEqual(7);
  });
});

const expectFracsEqual = (f1: Fraction, f2: Fraction): void => {
  if (!f1.equals(f2)) {
    console.log(`Found: ${f1.toString()}, Expected: ${f2.toString()}`);
  }
  expect(f1.equals(f2)).toBe(true);
};

describe("Fraction Tests", () => {
  test("Creation", () => {
    expect(Frac(2, 3)).toEqual(new Fraction(2, 3));
    expectFracsEqual(Frac(2, 3), Frac(8, 12));
    expectFracsEqual(Frac(2, 3), Frac(4, 6));
  });

  test("Additions", () => {
    expectFracsEqual(Frac(2, 3).plusNum(1), Frac(5, 3));
    expectFracsEqual(Frac(4, 5).plus(Frac(10, 5)), Frac(14, 5));
    expectFracsEqual(Frac(4, 5).plus(Frac(18, 8)), Frac(122, 40));
    expectFracsEqual(Frac(4, 5).plus(Frac(18, 8)), Frac(61, 20));
    expectFracsEqual(Frac(2, 3).plusNum(-1), Frac(-1, 3));
  });

  test("Multiplication", () => {
    expectFracsEqual(Frac(2, 3).timesNum(1), Frac(2, 3));
  });

  test("Division", () => {
    expectFracsEqual(Frac(2, 3).divby(Frac(2, 3)), Fraction.ONE);
    expectFracsEqual(Frac(2, 3).divbyNum(2), Frac(1, 3));
    expectFracsEqual(Frac(2, 3).inverse, Frac(3, 2));
  });

  test("Subtractions", () => {
    expectFracsEqual(Frac(2, 3).minusNum(1), Frac(-1, 3));
    expectFracsEqual(Frac(4, 5).minus(Frac(10, 5)), Frac(-6, 5));
    expectFracsEqual(Frac(4, 5).minus(Frac(18, 8)), Frac(-58, 40));
    expectFracsEqual(Frac(4, 5).minus(Frac(18, 8)), Frac(-29, 20));
    expectFracsEqual(Frac(2, 3).minusNum(-1), Frac(5, 3));
  });
});
