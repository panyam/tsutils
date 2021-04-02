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
  while (y) {
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

  constructor(num = 0, den = 1) {
    if (isNaN(num) || isNaN(den)) {
      throw new Error("Invalid numerator or denminator");
    }
    this.num = num;
    this.den = den;
  }

  get isWhole(): boolean {
    return this.num % this.den == 0;
  }

  get roundedUp(): number {
    if (this.num % this.den == 0) {
      return this.num / this.den;
    } else {
      return 1 + Math.floor(this.num / this.den);
    }
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

  plus(another: Fraction): Fraction {
    return new Fraction(this.num * another.den + this.den * another.num, this.den * another.den);
  }

  plusNum(another: number): Fraction {
    return new Fraction(this.num + this.den * another, this.den);
  }

  minus(another: Fraction): Fraction {
    return new Fraction(this.num * another.den - this.den * another.num, this.den * another.den);
  }

  minusNum(another: number): Fraction {
    return new Fraction(this.num - this.den * another, this.den);
  }

  times(another: Fraction): Fraction {
    return new Fraction(this.num * another.num, this.den * another.den);
  }

  timesNum(another: number): Fraction {
    return new Fraction(this.num * another, this.den);
  }

  divby(another: Fraction): Fraction {
    return new Fraction(this.num * another.den, this.den * another.num);
  }

  divbyNum(another: number): Fraction {
    return new Fraction(this.num, this.den * another);
  }

  /**
   * Returns another / this.
   */
  numDivby(another: number): Fraction {
    return new Fraction(this.den * another, this.num);
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

  isLTNum(another: number): boolean {
    return this.cmpNum(another) < 0;
  }

  isGT(another: Fraction): boolean {
    return this.cmp(another) > 0;
  }

  isGTNum(another: number): boolean {
    return this.cmpNum(another) > 0;
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
export const Frac = (a = 0, b = 1): Fraction => new Fraction(a, b);
