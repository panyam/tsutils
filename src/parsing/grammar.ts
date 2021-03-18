import { Nullable, StringMap } from "../types";
import { assert } from "../utils/misc";

export enum IDType {
  TERM,
  NON_TERM,
  STR,
  // SYM,
  MAX_TYPES,
}

abstract class GObj {
  grammar: Grammar;
  abstract readonly tag: IDType;

  equals(another: GObj): boolean {
    return this.tag == another.tag;
  }

  abstract toString(): string;
}

export enum Cardinality {
  ATMOST_1 = -2,
  ATLEAST_0 = -1,
  EXACTLY_1 = 1,
  ATLEAST_1 = 2,
}

export function multiplyCardinalities(c1: Cardinality, c2: Cardinality): Cardinality {
  // * . X = *
  // X. * = *
  if (c1 == Cardinality.ATLEAST_0 || c2 == Cardinality.ATLEAST_0) return Cardinality.ATLEAST_0;

  // 1. X = X
  if (c1 == Cardinality.EXACTLY_1) return c2;

  // X . 1 = X
  if (c2 == Cardinality.EXACTLY_1) return c1;

  // X . X = X
  if (c1 == c2) return c1;

  return Cardinality.ATLEAST_0;
}

export abstract class Lit extends GObj {
  abstract readonly isTerminal: boolean;
  readonly label: string;
  isAuxiliary = false;
  precedence = 1;
  assocLeft = true;

  private static idCounter = -1;

  /**
   * ID unique across all expression within the grammar.
   */
  id: number = Lit.idCounter--;

  /**
   * Index unique across all expressions of a particular type within the grammar.
   */
  index = -1;

  constructor(label: string, isAuxiliary = false) {
    super();
    this.isAuxiliary = isAuxiliary;
    this.label = label;
  }

  equals(another: this): boolean {
    return super.equals(another) && this.label == another.label;
  }

  toString(): string {
    return this.label;
  }
}

export class Term extends Lit {
  readonly tag: IDType = IDType.TERM;
  readonly isTerminal = true;
}

export class NonTerm extends Lit {
  readonly tag: IDType = IDType.NON_TERM;
  readonly isTerminal = false;
  rules: Str[] = [];

  equals(another: this): boolean {
    return super.equals(another) && this.label == another.label;
  }

  add(production: Str): void {
    if (/*production.tag != IDType.SYM && */ production.tag != IDType.STR) {
      assert(false, "Invalid production");
    }
    if (this.findRule(production) >= 0) {
      throw new Error("Duplicate rule");
    }
    this.rules.push(production);
  }

  /**
   * Checks if a rule already exists in the list of productions for
   * this non terminal.
   */
  findRule(production: Str): number {
    for (let i = this.rules.length - 1; i >= 0; i--) {
      const rule = this.rules[i];
      if (rule == production) return i;
      if (rule.equals(production)) return i;
    }
    return -1;
  }

  /**
   * Returns true if the rules of this non-term match the rules of
   * another non terminal.
   * This is used for seeing if duplicates exist when creating auxiliary
   * non-terminals so duplicates are not created.
   */
  rulesEqual(rules: Str[]): boolean {
    if (this.rules.length != rules.length) return false;
    for (let i = this.rules.length - 1; i >= 0; i--) {
      if (!this.rules[i].equals(rules[i])) {
        return false;
      }
    }
    return true;
  }
}

export class Str extends GObj {
  readonly tag: IDType = IDType.STR;
  syms: Lit[];
  cardinalities: Cardinality[];

  constructor(...syms: Lit[]) {
    super();
    this.syms = syms || [];
    this.cardinalities = [];
  }

  add(lit: Lit, cardinality: Cardinality = Cardinality.EXACTLY_1): void {
    this.syms.push(lit);
    this.cardinalities.push(cardinality);
  }

  isNullable(index: number): boolean {
    return this.cardinalities[index] == Cardinality.ATLEAST_0 || this.cardinalities[index] == Cardinality.ATMOST_1;
  }

  isTerminal(index: number): boolean {
    return this.syms[index].isTerminal;
  }

  get length(): number {
    return this.syms.length;
  }

  toString(): string {
    return this.syms.map((s) => s.toString()).join(" ");
  }

  equals(another: this): boolean {
    if (!super.equals(another)) return false;
    if (this.syms.length != another.syms.length) return false;
    for (let i = 0; i < this.syms.length; i++) {
      if (!this.syms[i].equals(another.syms[i])) return false;
      if (this.cardinalities[i] != another.cardinalities[i]) return false;
    }
    return true;
  }

  get debugString(): string {
    return this.syms
      .map((lit, i) => {
        let out = lit.label;
        if (this.cardinalities[i] == Cardinality.ATLEAST_0) out += "*";
        else if (this.cardinalities[i] == Cardinality.ATLEAST_1) out += "+";
        else if (this.cardinalities[i] == Cardinality.ATMOST_1) out += "?";
        return out;
      })
      .join(" ");
  }
}

export class Grammar {
  public startSymbol: Nullable<NonTerm> = null;
  private _modified = true;
  protected _terminals: Term[] = [];
  protected _nonTerminals: NonTerm[] = [];
  protected _auxNonTerminals: NonTerm[] = [];
  protected literalsByName: StringMap<Lit> = {};
  protected literalsById: Lit[] = [];
  protected currentNonTerm: Nullable<NonTerm> = null;

  readonly Eof = new Term("<EOF>");

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
      this.newTerm(t);
    }
  }

  get terminals(): ReadonlyArray<Term> {
    return this._terminals;
  }

  get nonTerminals(): ReadonlyArray<NonTerm> {
    return this._nonTerminals;
  }

  get auxNonTerminals(): ReadonlyArray<NonTerm> {
    return this._auxNonTerminals;
  }

  /**
   * A way to quickly iterate through all non-terminals.
   */
  forEachNT(visitor: (nt: NonTerm) => void | boolean | undefined | null): void {
    for (const nt of this._nonTerminals) {
      if (visitor(nt) == false) return;
    }
    for (const nt of this._auxNonTerminals) {
      if (visitor(nt) == false) return;
    }
  }

  /**
   * A iterator across all the rules of all non terminals in this grammar.
   *
   * @param visitor
   */
  forEachRule(visitor: (nt: NonTerm, rule: Str, index: number) => void | boolean | undefined | null): void {
    this.forEachNT((nt: NonTerm) => {
      for (let i = 0; i < nt.rules.length; i++) {
        if (visitor(nt, nt.rules[i], i) == false) return false;
      }
    });
  }

  /**
   * Adds a new rule to a particular non terminal of the grammar
   * Each rule represents a production of the form:
   *
   * name -> A B C D;
   *
   * Null production can be represented with an empty exps list.
   */
  add(nt: string, production: Str): this {
    let nonterm = this.getLit(nt);
    if (nonterm == null) {
      // create it
      nonterm = this.newNT(nt);
    } else {
      if (nonterm.isTerminal) {
        throw new Error("Cannot add rules to a terminal");
      }
    }
    (nonterm as NonTerm).add(production);
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
  getLit(label: string): Nullable<Lit> {
    return this.literalsByName[label] || null;
  }

  getLitById(id: number): Nullable<Lit> {
    if (id < 0) return this.Eof;
    return this.literalsById[id] || null;
  }

  getTerm(label: string, ensure = false): Nullable<Term> {
    let lit = this.getLit(label);
    if (lit == null) {
      if (ensure) {
        lit = this.newTerm(label);
      }
    } else if (!lit.isTerminal) {
      return null;
    }
    return lit as Term;
  }

  getNT(label: string, ensure = false): Nullable<NonTerm> {
    let lit = this.getLit(label);
    if (lit == null) {
      if (ensure) {
        lit = this.newNT(label);
      }
    } else if (lit.isTerminal) {
      return null;
    }
    return lit as NonTerm;
  }

  newTerm(label: string): Term {
    if (this.getLit(label) != null) {
      throw new Error(`${label} is already exists`);
    }
    return this.wrapLit(new Term(label));
  }

  /**
   * Creates a non terminal with the given label.
   * The grammar acts as a factory for non terminal symbols
   * so that we can reuse symbols instead of having
   * users create new symbols each time.
   *
   * This also ensures that users are not able mix terminal
   * and non terminal labels.
   */
  newNT(label: string, isAuxiliary = false): NonTerm {
    if (this.getLit(label) != null) {
      throw new Error(`Non-terminal ${label} is already exists`);
    }
    const out = this.wrapLit(new NonTerm(label, isAuxiliary)) as NonTerm;
    if (!isAuxiliary) {
      if (this.startSymbol == null) {
        this.startSymbol = out;
      }
    }
    return out;
  }

  /**
   * Checks if a given label is a terminal.
   */
  isTerminal(label: string): boolean {
    const t = this.literalsByName[label] || null;
    return t != null && t.isTerminal;
  }

  /**
   * Checks if a given label is a non-terminal.
   */
  isNT(label: string): boolean {
    const t = this.literalsByName[label] || null;
    return t != null && !t.isTerminal && !t.isAuxiliary;
  }

  /**
   * Checks if a given label is an auxiliary non-terminal.
   */
  isAuxNT(label: string): boolean {
    const t = this.literalsByName[label] || null;
    return t != null && !t.isTerminal && t.isAuxiliary;
  }

  protected cardinal(exp: Str | string, cardinality: Cardinality): Str {
    // Convert into either a symbol *or* another Sym over an auxiliar
    // non-term and then apply cardinality
    let str = this.normalizeRule(exp);
    if (str.length > 1) {
      // if we have a multi length string then create an Aux NT out of this
      const nt = this.ensureAuxNT(str);
      str = new Str(nt);
    }
    str.cardinalities[0] = multiplyCardinalities(str.cardinalities[0], cardinality);
    return str;
  }

  opt(exp: Str | string): Str {
    return this.cardinal(exp, Cardinality.ATMOST_1);
  }

  atleast0(exp: Str | string): Str {
    return this.cardinal(exp, Cardinality.ATLEAST_0);
  }

  atleast1(exp: Str | string): Str {
    return this.cardinal(exp, Cardinality.ATLEAST_1);
  }

  seq(...exps: (Str | string)[]): Str {
    if (exps.length == 1) {
      return this.normalizeRule(exps[0]);
    } else {
      const out = new Str();
      for (const e of exps) {
        const s = this.normalizeRule(e);
        // insert string here inline
        // A ( B C D ) => A B C D
        for (let i = 0; i < s.length; i++) {
          out.add(s.syms[i], s.cardinalities[i]);
        }
      }
      return out;
    }
  }

  /**
   * Provides a union rule:
   *
   * (A | B | C | D)
   *
   * Each of A, B, C or D themselves could be strings or literals.
   */
  anyof(...rules: (Str | string)[]): Str {
    if (rules.length == 1) {
      return this.normalizeRule(rules[0]);
    } else {
      // see if there is already NT with the exact set of rules
      // reuse if it exists.  That would make this method
      // Idempotent (which it needs to be).
      return new Str(this.ensureAuxNT(...rules.map((r) => this.normalizeRule(r))));
    }
  }

  protected wrapLit<T extends Lit>(lit: Lit): T {
    assert(lit.id < 0, "Literal already wrapped: " + lit.id);
    assert(lit.index < 0, "Literal already wrapped: " + lit.index);
    lit.grammar = this;
    lit.id = this.literalsById.length;
    this.literalsById.push(lit);
    if (lit.isTerminal) {
      lit.index = this._terminals.length;
      this._terminals.push(lit as Term);
    } else if (lit.isAuxiliary) {
      lit.index = this._auxNonTerminals.length;
      this._auxNonTerminals.push(lit as NonTerm);
    } else {
      lit.index = this._nonTerminals.length;
      this._nonTerminals.push(lit as NonTerm);
    }
    this.literalsByName[lit.label] = lit;

    return lit as T;
  }

  normalizeRule(exp: Str | string): Str {
    if (typeof exp === "string") {
      const lit = this.getLit(exp);
      if (lit == null) throw new Error(`Invalid symbol: '${exp}'`);
      return new Str(lit);
      /*} else if (exp.tag == IDType.TERM) {
      return new Sym(exp as Term);
    } else if (exp.tag == IDType.NON_TERM) {
      return new Sym(exp as NonTerm);*/
    } else {
      // We have an expression that needs to be fronted by an
      // auxiliarry non-terminal
      assert(exp.tag == IDType.STR /* || exp.tag == IDType.SYM */, "Found tag: " + exp.tag);
      return exp;
    }
  }

  // Override this to have a different
  protected auxNTCount = 0;
  protected newAuxNTName(): string {
    return "$" + this.auxNTCount++;
  }

  public newAuxNT(): NonTerm {
    const ntName = this.newAuxNTName();
    return this.newNT(ntName, true);
  }

  protected ensureAuxNT(...rules: Str[]): NonTerm {
    let nt = this.findAuxNT(...rules);
    if (nt == null) {
      nt = this.newAuxNT();
      for (const rule of rules) nt.add(rule);
    }
    return nt;
  }

  /**
   * Find an auxiliary rule that has the same rules as the ones here.
   * This can be used to ensure duplicate rules are not created for
   * union expressions.
   */
  findAuxNT(...rules: Str[]): Nullable<NonTerm> {
    for (const auxNT of this._auxNonTerminals) {
      if (auxNT.rulesEqual(rules)) return auxNT;
    }
    return null;
  }
}
