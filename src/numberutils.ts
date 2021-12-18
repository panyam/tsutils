import { Nullable } from "./types";

export function range(start: number, end: Nullable<number> = null, incr: Nullable<number> = 1): number[] {
  if (end == null) {
    const absStart = Math.abs(start);
    const arr = Array.from({ length: absStart });
    if (start >= 0) {
      return arr.map((x, i) => i);
    } else {
      return arr.map((x, i) => i - (absStart - 1));
    }
  }
  const out: number[] = [];
  if (incr == null) {
    incr = 1;
  }
  incr = Math.abs(incr);
  if (start !== end) {
    if (start < end) {
      for (let i = start; i <= end; i += incr) {
        out.push(i);
      }
    } else {
      for (let i = start; i >= end; i -= incr) {
        out.push(i);
      }
    }
  }
  return out;
}

/*
export function applyMixins(derivedCtor: any, baseCtors: any[]) {
    baseCtors.forEach(baseCtor => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
            Object.defineProperty(derivedCtor.prototype, name,
                Object.getOwnPropertyDescriptor(baseCtor.prototype, name));
        });
    });
}
*/

export function gcdof(x: number, y: number): number {
  x = Math.abs(x);
  y = Math.abs(y);
  while (y > 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

export class Fraction {
  readonly num: number;
  readonly den: number;

  static readonly ZERO = new Fraction();
  static readonly ONE = new Fraction(1, 1);
  static readonly INFINITY = new Fraction(1, 0);

  constructor(num = 0, den = 1, factorized = false) {
    if (isNaN(num) || isNaN(den)) {
      throw new Error(`Invalid numerator(${num}) or denminator(${den})`);
    }
    if (factorized) {
      const gcd = gcdof(this.num, this.den);
      num /= gcd;
      den /= gcd;
    }
    this.num = num;
    this.den = den;
  }

  static parse(val: string, factorized = false): Fraction {
    const parts = val
      .trim()
      .split("/")
      .map((x) => x.trim());
    let num = 1;
    let den = 1;
    if (parts.length == 1) num = parseInt(parts[0]);
    else if (parts.length != 2) {
      throw new Error("Invalid fraction string: " + val);
    } else {
      if (parts[0].length > 0) {
        num = parseInt(parts[0]);
      }
      if (parts[1].length > 0) {
        den = parseInt(parts[1]);
      }
    }
    if (isNaN(num) || isNaN(den)) {
      throw new Error("Invalid fraction string: " + val);
    }
    return new Fraction(num, den, factorized);
  }

  get isWhole(): boolean {
    return this.num % this.den == 0;
  }

  get isZero(): boolean {
    return this.num == 0;
  }

  get isInfinity(): boolean {
    return this.den == 0;
  }

  get isOne(): boolean {
    return this.num == this.den;
  }

  get ceil(): number {
    if (this.num % this.den == 0) {
      return this.num / this.den;
    } else {
      return 1 + Math.floor(this.num / this.den);
    }
  }

  get floor(): number {
    if (this.num % this.den == 0) {
      return this.num / this.den;
    } else {
      return Math.floor(this.num / this.den);
    }
  }

  plus(another: Fraction, factorized = false): Fraction {
    return new Fraction(this.num * another.den + this.den * another.num, this.den * another.den, factorized);
  }

  plusNum(another: number, factorized = false): Fraction {
    return new Fraction(this.num + this.den * another, this.den, factorized);
  }

  minus(another: Fraction, factorized = false): Fraction {
    return new Fraction(this.num * another.den - this.den * another.num, this.den * another.den, factorized);
  }

  minusNum(another: number, factorized = false): Fraction {
    return new Fraction(this.num - this.den * another, this.den, factorized);
  }

  times(another: Fraction, factorized = false): Fraction {
    return new Fraction(this.num * another.num, this.den * another.den, factorized);
  }

  timesNum(another: number, factorized = false): Fraction {
    return new Fraction(this.num * another, this.den, factorized);
  }

  divby(another: Fraction, factorized = false): Fraction {
    return new Fraction(this.num * another.den, this.den * another.num, factorized);
  }

  divbyNum(another: number, factorized = false): Fraction {
    return new Fraction(this.num, this.den * another, factorized);
  }

  /**
   * Returns another / this.
   */
  numDivby(another: number, factorized = false): Fraction {
    return new Fraction(this.den * another, this.num, factorized);
  }

  /**
   * Returns this % another
   */
  mod(another: Fraction): Fraction {
    // a (mod b) = a − b ⌊a / b⌋
    const d = this.divby(another);
    const floorOfD = Math.floor(d.num / d.den);
    return this.minus(another.timesNum(floorOfD));
  }

  /*
   * Returns this % another
   */
  modNum(another: number): Fraction {
    // a (mod b) = a − b ⌊a / b⌋
    const d = this.divbyNum(another);
    const floorOfD = Math.floor(d.num / d.den);
    return this.minusNum(another * floorOfD);
  }

  get inverse(): Fraction {
    return new Fraction(this.den, this.num);
  }

  get factorized(): Fraction {
    const gcd = gcdof(this.num, this.den);
    return new Fraction(this.num / gcd, this.den / gcd);
  }

  equals(another: Fraction): boolean {
    return this.num * another.den == this.den * another.num;
  }

  equalsNum(another: number): boolean {
    return this.num == this.den * another;
  }

  cmp(another: Fraction): number {
    return this.num * another.den - this.den * another.num;
  }

  cmpNum(another: number): number {
    return this.num - this.den * another;
  }

  isLT(another: Fraction): boolean {
    return this.cmp(another) < 0;
  }

  isLTE(another: Fraction): boolean {
    return this.cmp(another) <= 0;
  }

  isLTNum(another: number): boolean {
    return this.cmpNum(another) < 0;
  }

  isLTENum(another: number): boolean {
    return this.cmpNum(another) <= 0;
  }

  isGT(another: Fraction): boolean {
    return this.cmp(another) > 0;
  }

  isGTE(another: Fraction): boolean {
    return this.cmp(another) >= 0;
  }

  isGTNum(another: number): boolean {
    return this.cmpNum(another) > 0;
  }

  isGTENum(another: number): boolean {
    return this.cmpNum(another) >= 0;
  }

  toString(): string {
    return this.num + "/" + this.den;
  }

  static max(f1: Fraction, f2: Fraction): Fraction {
    return f1.cmp(f2) > 0 ? f1 : f2;
  }

  static min(f1: Fraction, f2: Fraction): Fraction {
    return f1.cmp(f2) < 0 ? f1 : f2;
  }
}

// Shortcut helper
export const Frac = (a = 0, b = 1, factorized = false): Fraction => new Fraction(a, b, factorized);
