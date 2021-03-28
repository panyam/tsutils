import { MAX_INT, Nullable, NumMap, StringMap } from "../types";
import { assert } from "../utils/misc";
import { allMinimalCycles } from "./graph";

export enum IDType {
  TERM,
  NON_TERM,
  STR,
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

/**
 * Symbols represent both terminals and non-terminals in our system.
 * Chosing a convention of using a single class to represent both instead
 * of a base class with Term and NonTerm children has the following effects:
 * 1. We can change the type of a literal when doing things like reading
 *    a grammar DSL when we dont konw if a symbol is a term or non-term
 *    until *all* the declarations have been read and parsed.
 * 2. The down side of this we would need more explicit isTerm checks
 *    but we would have done that anyway by calling getTerm and getNT
 *    verions of the getSym method.
 */
export class Sym {
  readonly grammar: Grammar;
  readonly label: string;
  isTerminal = false;
  rules: Str[] = [];
  isAuxiliary = false;
  precedence = 1;
  assocLeft = true;

  private static idCounter = -1;

  /**
   * ID unique across all expression within the grammar.
   */
  id: number;

  constructor(grammar: Grammar, label: string, isTerminal: boolean, id: Nullable<number> = null) {
    this.isTerminal = isTerminal;
    this.label = label;
    if (id == null) {
      this.id = Sym.idCounter--;
    } else {
      this.id = id;
    }
  }

  equals(another: this): boolean {
    return this.label == another.label;
  }

  toString(): string {
    return this.label;
  }

  add(production: Str): void {
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
  syms: Sym[];

  constructor(...syms: Sym[]) {
    super();
    this.syms = syms || [];
    // this.cardinalities = [];
  }

  append(...lits: Sym[]): this {
    for (const l of lits) this.syms.push(l);
    return this;
  }

  extend(...strs: Str[]): this {
    for (const s of strs) this.append(...s.syms);
    return this;
  }

  copy(): Str {
    return new Str(...this.syms);
  }

  add(lit: Sym): void {
    this.syms.push(lit);
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
      // if (this.cardinalities[i] != another.cardinalities[i]) return false;
    }
    return true;
  }

  /**
   * Returns true if another string is a substring within
   * this string at the given offset.
   */
  containsAt(offset: number, another: Str): boolean {
    let i = 0;
    for (; i < another.length && offset + i < this.syms.length; i++) {
      if (!this.syms[offset + i].equals(another.syms[i])) return false;
      // if (this.cardinalities[i] != another.cardinalities[i]) return false;
    }
    return i == another.length;
  }

  get debugString(): string {
    return this.syms.map((lit) => lit.label).join(" ");
  }
}

export class Grammar {
  public startSymbol: Nullable<Sym> = null;
  private _modified = true;
  protected _allSymbols: Sym[] = [];
  protected symbolsByName: StringMap<Sym> = {};
  protected symbolsById: Sym[] = [];
  protected currentNonTerm: Nullable<Sym> = null;

  readonly Eof = new Sym(this, "<EOF>", true, -1);
  private _AugStart = new Sym(this, "$", false, -2);

  protected _followSets: Nullable<FollowSets> = null;

  /**
   * A way of creating Grammars with a "single expresssion".
   */
  static make(callback: (g: Grammar) => void): Grammar {
    const g = new Grammar();
    callback(g);
    return g;
  }

  get nullables(): NullableSet {
    return this.firstSets.nullables;
  }

  get firstSets(): FirstSets {
    return this.followSets.firstSets;
  }

  get followSets(): FollowSets {
    if (this._followSets == null) {
      this._followSets = new FollowSets(this);
    }
    return this._followSets;
  }

  get augStart(): Sym {
    return this._AugStart;
  }

  augmentStartSymbol(label = "$"): this {
    assert(this.getSym(label) == null);
    this._AugStart = new Sym(this, label, false, -2);
    if (this.startSymbol) {
      this._AugStart.add(new Str(this.startSymbol));
    }
    return this;
  }

  refresh(): void {
    this._followSets = null;
  }

  addTerminals(...terminals: string[]): void {
    for (const t of terminals) {
      this.newTerm(t);
    }
  }

  get terminals(): ReadonlyArray<Sym> {
    return this._allSymbols.filter((x) => x.isTerminal);
  }

  get nonTerminals(): ReadonlyArray<Sym> {
    return this._allSymbols.filter((x) => !x.isTerminal && !x.isAuxiliary);
  }

  get auxNonTerminals(): ReadonlyArray<Sym> {
    return this._allSymbols.filter((x) => x.isAuxiliary);
  }

  get allSymbols(): ReadonlyArray<Sym> {
    return this._allSymbols;
  }

  /**
   * A way to quickly iterate through all non-terminals.
   */
  forEachNT(visitor: (nt: Sym) => void | boolean | undefined | null): void {
    for (const sym of this._allSymbols) {
      if (sym.isTerminal) continue;
      if (visitor(sym) == false) return;
    }
  }

  /**
   * A iterator across all the rules of all non terminals in this grammar.
   *
   * @param visitor
   */
  forEachRule(visitor: (nt: Sym, rule: Str, index: number) => void | boolean | undefined | null): void {
    this.forEachNT((nt: Sym) => {
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
    let nonterm = this.getSym(nt);
    if (nonterm == null) {
      // create it
      nonterm = this.newNT(nt);
    } else {
      if (nonterm.isTerminal) {
        throw new Error("Cannot add rules to a terminal");
      }
    }
    nonterm.add(production);
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

  getSymById(id: number): Nullable<Sym> {
    if (id == -1) return this.Eof;
    else if (id == -2) return this._AugStart;
    return this.symbolsById[id] || null;
  }

  getSym(label: string): Nullable<Sym> {
    if (label == this._AugStart.label) return this._AugStart;
    return this.symbolsByName[label] || null;
  }

  newTerm(label: string): Sym {
    if (this.getSym(label) != null) {
      throw new Error(`${label} is already exists`);
    }
    return this.wrapSym(new Sym(this, label, true));
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
  newNT(label: string, isAuxiliary = false): Sym {
    if (this.getSym(label) != null) {
      throw new Error(`Non-terminal ${label} is already exists`);
    }
    let nt = new Sym(this, label, false);
    nt.isAuxiliary = isAuxiliary;
    nt = this.wrapSym(nt);
    if (!isAuxiliary) {
      if (this.startSymbol == null) {
        this.startSymbol = nt;
      }
    }
    return nt;
  }

  /**
   * Checks if a given label is a terminal.
   */
  isTerminal(label: string): boolean {
    const t = this.symbolsByName[label] || null;
    return t != null && t.isTerminal;
  }

  /**
   * Checks if a given label is a non-terminal.
   */
  isNT(label: string): boolean {
    const t = this.symbolsByName[label] || null;
    return t != null && !t.isTerminal && !t.isAuxiliary;
  }

  /**
   * Checks if a given label is an auxiliary non-terminal.
   */
  isAuxNT(label: string): boolean {
    const t = this.symbolsByName[label] || null;
    return t != null && !t.isTerminal && t.isAuxiliary;
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
          // out.add(s.syms[i], s.cardinalities[i]);
          out.add(s.syms[i]);
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

  opt(exp: Str | string): Str {
    // convert to aux rule
    return this.anyof(exp, new Str());
  }

  atleast0(exp: Str | string, leftRec = false): Str {
    const s = this.normalizeRule(exp);
    // We want to find another auxiliary NT that has the following rules:
    //    X -> exp X | ;    # if leftRec = true
    //
    //    X -> X exp | ;    # otherwise:
    let auxNT = this.findAuxNT((auxNT) => {
      if (auxNT.rules.length != 2) return false;

      let which = 0;
      if (auxNT.rules[0].length == 0) {
        which = 1;
      } else if (auxNT.rules[1].length == 0) {
        which = 0;
      } else {
        return false;
      }

      const rule = auxNT.rules[which];
      if (rule.length != 1 + exp.length) return false;
      if (rule.syms[0].equals(auxNT)) {
        return rule.containsAt(1, s);
      } else if (rule.syms[rule.length - 1].equals(auxNT)) {
        return rule.containsAt(0, s);
      }
      return false;
    });
    if (auxNT == null) {
      auxNT = this.newAuxNT();
      auxNT.add(new Str());
      if (leftRec) {
        auxNT.add(new Str(auxNT).extend(s));
      } else {
        auxNT.add(s.copy().append(auxNT));
      }
    }
    return new Str(auxNT);
  }

  atleast1(exp: Str | string, leftRec = false): Str {
    const s = this.normalizeRule(exp);
    // We want to find another auxiliary NT that has the following rules:
    //    X -> exp X | exp ;    # if leftRec = true
    //
    //    X -> X exp | exp ;    # otherwise:
    let auxNT = this.findAuxNT((auxNT) => {
      if (auxNT.rules.length != 2) return false;

      let which = 0;
      if (auxNT.rules[0].equals(s)) {
        which = 1;
      } else if (auxNT.rules[1].equals(s)) {
        which = 0;
      } else {
        return false;
      }

      const rule = auxNT.rules[which];
      if (rule.length != 1 + exp.length) return false;
      if (rule.syms[0].equals(auxNT)) {
        return rule.containsAt(1, s);
      } else if (rule.syms[rule.length - 1].equals(auxNT)) {
        return rule.containsAt(0, s);
      }
      return false;
    });
    if (auxNT == null) {
      auxNT = this.newAuxNT();
      auxNT.add(s);
      if (leftRec) {
        auxNT.add(new Str(auxNT).extend(s));
      } else {
        auxNT.add(s.copy().append(auxNT));
      }
    }
    return new Str(auxNT);
  }

  protected wrapSym(sym: Sym): Sym {
    assert(sym.id < 0, "Symbol already wrapped: " + sym.id);
    // assert(sym.index < 0, "Symbol already wrapped: " + sym.index);
    sym.id = this.symbolsById.length;
    this.symbolsById.push(sym);
    this.symbolsByName[sym.label] = sym;
    this._allSymbols.push(sym);
    return sym;
  }

  normalizeRule(exp: Str | string): Str {
    if (typeof exp === "string") {
      const lit = this.getSym(exp);
      if (lit == null) throw new Error(`Invalid symbol: '${exp}'`);
      return new Str(lit);
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

  newAuxNT(): Sym {
    const ntName = this.newAuxNTName();
    return this.newNT(ntName, true);
  }

  ensureAuxNT(...rules: Str[]): Sym {
    let nt = this.findAuxNTByRules(...rules);
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
  findAuxNT(filter: (nt: Sym) => boolean): Nullable<Sym> {
    // for (const auxNT of this._auxNonTerminals) {
    for (const auxNT of this._allSymbols) {
      if (!auxNT.isAuxiliary) continue;
      if (filter(auxNT)) return auxNT;
    }
    return null;
  }

  findAuxNTByRules(...rules: Str[]): Nullable<Sym> {
    return this.findAuxNT((auxNT) => auxNT.rulesEqual(rules));
  }

  /**
   * Returns a flat list of all productions in a single list.
   */
  debugValue(hideAux = false): string[] {
    const out: string[] = [];
    this.forEachRule((nt: Sym, rule: Str, index: number) => {
      out.push(`${nt.label} -> ${rule.debugString}`);
    });
    return out;
  }

  /**
   * Returns all cycles in this grammar.
   */
  get cycles(): any {
    /*
     * Returns the edge of the given nonterm
     * For a nt such that:
     *             S -> alpha1 X1 beta1 |
     *                  alpha2 X2 beta2 |
     *                  ...
     *                  alphaN XN betaN |
     *
     * S's neighbouring nodes would be Xk if all of alphak is optional
     * AND all of betak is optional
     */
    const edgeFunctor = (node: Sym): [Sym, any][] => {
      const out: [Sym, any][] = [];
      node.rules.forEach((rule, ruleIndex) => {
        rule.syms.forEach((s, j) => {
          if (s.isTerminal) return;
          if (this.nullables.isStrNullable(rule, 0, j - 1) && this.nullables.isStrNullable(rule, j + 1)) {
            out.push([s, [node, ruleIndex]]);
          }
        });
      });
      return out;
    };
    return allMinimalCycles(this.nonTerminals, (val: Sym) => val.label, edgeFunctor);
  }

  /**
   * Returns a set of "Starting" non terminals which have atleast
   * one production containing left recursion.
   */
  get leftRecursion(): any {
    const edgeFunctor = (node: Sym): [Sym, any][] => {
      const out: [Sym, any][] = [];
      node.rules.forEach((rule, ruleIndex) => {
        rule.syms.forEach((s, j) => {
          if (s.isTerminal) return;
          out.push([s, ruleIndex]);
          // If this is symbol is not nullable then we can stop here
          return this.nullables.isNullable(s);
        });
      });
      return out;
    };
    return allMinimalCycles(this.nonTerminals, (val: Sym) => val.id, edgeFunctor);
  }
}

import { TermSet, FirstSets, FollowSets, NullableSet } from "./sets";
