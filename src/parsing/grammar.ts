import { Nullable, StringMap, NumMap, MAX_INT } from "../types";
import { assert } from "../utils/misc";

export enum ExpType {
  TERM = 0,
  NON_TERM = 1,
  OPTIONAL = 2,
  ATLEAST_0 = 3,
  ATLEAST_1 = 4,
  ANY_OF = 5,
  SEQ = 6,
  MAX_TYPE = 7,
}

export abstract class Exp {
  /**
   * ID unique across all expression within the grammar.
   */
  id: number;

  /**
   * Index unique across all expressions of a particular type within the grammar.
   */
  index: number;
  grammar: Grammar;
  abstract readonly type: ExpType;

  constructor() {
    this.id = -MAX_INT;
    this.index = -MAX_INT;
  }
  equals(another: Exp): boolean {
    return this.type == another.type;
  }
}

export abstract class Sym extends Exp {
  readonly type: ExpType;
  readonly label: string;
  readonly isTerminal: boolean;
  precedence = 1;
  assocLeft = true;
  constructor(label: string, isTerminal = true) {
    super();
    this.label = label;
    this.isTerminal = isTerminal;
    this.type = isTerminal ? ExpType.TERM : ExpType.NON_TERM;
  }

  equals(another: this): boolean {
    return super.equals(another) && this.label == another.label;
  }
}

export class Term extends Sym {
  constructor(label: string) {
    super(label);
  }
}

export class NonTerm extends Sym {
  rules: AnyOf = new AnyOf();
  constructor(label: string) {
    super(label, false);
  }

  add(exp: Exp): void {
    if (this.findRule(exp) >= 0) {
      throw new Error("Duplicate rule");
    }
    const rules = exp.type == ExpType.ANY_OF ? (exp as AnyOf).exps : [exp];
    for (const r of rules) {
      this.rules.add(r);
    }
  }

  /**
   * Checks if a rule already exists in the list of productions for
   * this non terminal.
   */
  findRule(exp: Exp): number {
    return this.rules.indexOf(exp);
  }
}

export abstract class WrapperExp extends Exp {
  readonly exp: Exp;
  constructor(exp: Exp) {
    super();
    this.exp = exp;
  }

  equals(another: this): boolean {
    return super.equals(another) && this.exp.equals(another.exp);
  }
}

export class Opt extends WrapperExp {
  readonly type: ExpType = ExpType.OPTIONAL;
}

export class Atleast0 extends WrapperExp {
  readonly type: ExpType = ExpType.ATLEAST_0;
}

export class Atleast1 extends WrapperExp {
  readonly type: ExpType = ExpType.ATLEAST_1;
}

export abstract class ExpList extends Exp {
  readonly type: ExpType;
  exps: Exp[];

  constructor(...exps: Exp[]) {
    super();
    this.exps = exps;
  }

  add(exp: Exp): void {
    this.exps.push(exp);
  }

  get length(): number {
    return this.exps.length;
  }

  indexOf(exp: Exp): number {
    for (let i = 0; i < this.exps.length; i++) {
      if (this.exps[i].equals(exp)) return i;
    }
    return -1;
  }

  equals(another: this): boolean {
    if (!super.equals(another)) return false;
    if (this.exps.length != another.exps.length) return false;
    for (let i = 0; i < this.exps.length; i++) {
      if (!this.exps[i].equals(another.exps[i])) return false;
    }
    return true;
  }
}

export class AnyOf extends ExpList {
  readonly type: ExpType = ExpType.ANY_OF;
}

export class Seq extends ExpList {
  readonly type: ExpType = ExpType.SEQ;
}

export class Grammar {
  public startSymbol: Nullable<NonTerm> = null;
  private _modified = true;
  protected _terminals: Term[] = [];
  protected _nonTerminals: NonTerm[] = [];
  protected terminalsByName: StringMap<Term> = {};
  protected nonTerminalsByName: StringMap<NonTerm> = {};
  protected expsById: Exp[] = [];
  protected expsByType: Exp[][] = [[], [], [], [], [], [], []];
  protected currentNonTerm: Nullable<NonTerm> = null;

  /**
   * A way of creating Grammars with a "single expresssion".
   */
  static make(callback: (g: Grammar) => void): Grammar {
    const g = new Grammar();
    callback(g);
    return g;
  }

  addTerminals(...terminals: string[]): void {
    for (const t of terminals) {
      this.term(t);
    }
  }

  get terminals(): ReadonlyArray<Term> {
    return this._terminals;
  }

  get nonTerminals(): ReadonlyArray<NonTerm> {
    return this._nonTerminals;
  }

  private _currTime = 0;
  get currTime(): number {
    return this._currTime;
  }

  advanceTime(): number {
    return ++this._currTime;
  }

  get modified(): boolean {
    return this._modified;
  }

  readonly Eof = new Term("<EOF>");
  readonly Null = new Term("");

  /**
   * Adds a new rule to a particular non terminal of the grammar
   * Each rule represents a production of the form:
   *
   * name -> exp1 | exp2 | exp3 | ... | expn
   *
   * Null production can be represented with an empty exps list.
   */
  add(nt: string, ...exps: (Exp | string)[]): this {
    const nonterm = this.nonterm(nt);
    let newExp: Exp;
    if (exps.length == 0) {
      newExp = this.Null;
    } else if (exps.length == 1) {
      newExp = this.normalizeExp(exps[0]);
    } else {
      newExp = this.anyof(...exps);
    }
    nonterm.add(newExp);
    return this;
  }

  /**
   * A slighty different way of adding rules where each
   * exp is part of a string on the production side.
   *
   * eg:
   *
   * name -> exp1 exp2 exp3 ... expn
   */
  addS(nt: string, ...exps: (Exp | string)[]): this {
    const nonterm = this.nonterm(nt);
    let newExp: Exp;
    if (exps.length == 0) {
      newExp = this.Null;
    } else if (exps.length == 1) {
      newExp = this.normalizeExp(exps[0]);
    } else {
      newExp = this.seq(...exps);
    }
    nonterm.add(newExp);
    return this;
  }

  /**
   * Gets or creates a terminal with the given label.
   * The grammar acts as a factory for terminal symbols
   * so that we can reuse symbols instead of having
   * users create new symbols each time.
   *
   * This also ensures that users are not able mix terminal
   * and non terminal labels.
   */
  term(labelOrIndex: string | number): Term {
    if (typeof labelOrIndex === "number") {
      assert(labelOrIndex >= 0, "Index cannot be negative");
      return this._terminals[labelOrIndex];
    } else {
      const label = labelOrIndex;
      if (label in this.nonTerminalsByName) {
        throw new Error(`${label} is already a non terminal`);
      } else if (label in this.terminalsByName) {
        return this.terminalsByName[label];
      }
      const out = this.wrapExp(new Term(label));
      this.terminalsByName[label] = out;
      this._terminals.push(out);
      return out;
    }
  }

  /**
   * Return a terminal by its ID.
   */
  expById(id: number): Nullable<Exp> {
    return this.expsById[id] || null;
  }

  /**
   * Return an expression of a particular type given its index.
   */
  expByType(type: ExpType, index: number): Nullable<Exp> {
    return this.expsByType[type][index] || null;
  }

  /**
   * Gets or creates a non terminal with the given label.
   * The grammar acts as a factory for non terminal symbols
   * so that we can reuse symbols instead of having
   * users create new symbols each time.
   *
   * This also ensures that users are not able mix terminal
   * and non terminal labels.
   */
  nonterm(labelOrIndex: string | number): NonTerm {
    if (typeof labelOrIndex === "number") {
      assert(labelOrIndex >= 0, "Index cannot be negative");
      return this._nonTerminals[labelOrIndex];
    } else {
      const label = labelOrIndex;
      if (this.isTerminal(label)) {
        throw new Error(`${label} is already a terminal`);
      } else if (label in this.nonTerminalsByName) {
        return this.nonTerminalsByName[label];
      }

      const out = this.wrapExp(new NonTerm(label));
      this.wrapExp(out.rules);
      this.nonTerminalsByName[label] = out;
      this._nonTerminals.push(out);
      if (this.startSymbol == null) {
        this.startSymbol = out;
      }
      this.currentNonTerm = out;
      return out;
    }
  }

  /**
   * Checks if a given label is a terminal.
   */
  isTerminal(label: string): boolean {
    return label in this.terminalsByName;
  }

  /**
   * Checks if a given label is a terminal.
   */
  isNonterm(label: string): boolean {
    return label in this.nonTerminalsByName;
  }

  normalizeExp(exp: Exp | string): Exp {
    if (typeof exp !== "string") {
      return exp;
    }
    if (this.isTerminal(exp)) {
      return this.term(exp);
    } else if (this.isNonterm(exp)) {
      return this.nonterm(exp);
    } else {
      // TODO - should we by default allow non existing symbols
      // to default to a nonterm since it is expected tokens
      // are already known in a parser.
      return this.nonterm(exp);
      // throw new Error(`${exp} is neither a terminal nor a non terminal.  Add it first.`);
    }
  }

  opt(exp: Exp | string): Exp {
    return this.wrapExp(new Opt(this.normalizeExp(exp)));
  }

  atleast0(exp: Exp | string): Exp {
    return this.wrapExp(new Atleast0(this.normalizeExp(exp)));
  }

  atleast1(exp: Exp | string): Exp {
    return this.wrapExp(new Atleast1(this.normalizeExp(exp)));
  }

  seq(...exps: (Exp | string)[]): Exp {
    return this.wrapExp(new Seq(...exps.map((e) => this.normalizeExp(e))));
  }

  anyof(...exps: (Exp | string)[]): Exp {
    return this.wrapExp(new AnyOf(...exps.map((e) => this.normalizeExp(e))));
  }

  protected wrapExp<T extends Exp>(exp: T): T {
    assert(exp.id == -MAX_INT, "Expression already wrapped");
    assert(exp.index == -MAX_INT, "Expression already wrapped");
    exp.grammar = this;
    exp.id = this.expsById.length;
    this.expsById.push(exp);

    exp.index = this.expsByType[exp.type].length;
    this.expsByType[exp.type].push(exp);
    return exp;
  }
}
