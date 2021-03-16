import { Nullable, StringMap } from "../types";
import { assert } from "../utils/misc";

export enum IDType {
  TERM,
  NON_TERM,
  STR,
  SYM,
  MAX_TYPES,
}

abstract class GObj {
  grammar: Grammar;
  abstract readonly tag: IDType;

  /**
   * ID unique across all expression within the grammar.
   */
  id: number;

  /**
   * Index unique across all expressions of a particular type within the grammar.
   */
  index: number;

  private static idCounter = -1;
  constructor() {
    this.id = GObj.idCounter--;
    this.index = GObj.idCounter--;
  }

  equals(another: GObj): boolean {
    return this.tag == another.tag;
  }
}

export enum Cardinality {
  ATMOST_1 = -2,
  ATLEAST_0 = -1,
  EXACTLY_1 = 1,
  ATLEAST_1 = 2,
}

export abstract class Exp extends GObj {
  abstract readonly isString: boolean;
  equals(another: this): boolean {
    return super.equals(another) && this.isString == another.isString;
  }

  abstract toString(): string;
}

export abstract class Lit extends GObj {
  abstract readonly isTerminal: boolean;
  readonly label: string;
  readonly isString = false;
  isAuxiliary = false;
  precedence = 1;
  assocLeft = true;
  constructor(label: string) {
    super();
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
  rules: Exp[] = [];
  protected _hasNull = false;

  set hasNull(v: boolean) {
    this._hasNull = v;
  }
  get hasNull(): boolean {
    return this._hasNull || this.rules.length == 0;
  }

  equals(another: this): boolean {
    return super.equals(another) && this.label == another.label;
  }

  add(production: Exp): void {
    if (production.tag != IDType.SYM && production.tag != IDType.STR) {
      assert(false, "Invalid production");
    }
    if (this.findRule(production) >= 0) {
      throw new Error("Duplicate rule");
    }
    if (production.tag == IDType.STR && (production as Str).syms.length == 0) {
      this.hasNull = true;
    } else {
      this.rules.push(production);
    }
  }

  /**
   * Checks if a rule already exists in the list of productions for
   * this non terminal.
   */
  findRule(production: Exp): number {
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
  rulesEqual(rules: Exp[]): boolean {
    if (this.rules.length != rules.length) return false;
    for (let i = this.rules.length - 1; i >= 0; i--) {
      if (!this.rules[i].equals(rules[i])) {
        return false;
      }
    }
    return true;
  }
}

export class Sym extends Exp {
  readonly tag: IDType = IDType.SYM;
  readonly isString: false;
  readonly value: Lit;
  cardinality: Cardinality = Cardinality.EXACTLY_1;
  constructor(value: Lit) {
    super();
    this.value = value;
  }

  toString(): string {
    let out = this.value.toString();
    switch (this.cardinality) {
      case Cardinality.ATLEAST_1:
        out += " + ";
        break;
      case Cardinality.ATMOST_1:
        out += " ? ";
        break;
      case Cardinality.ATLEAST_0:
        out += " * ";
        break;
      default:
        break;
    }
    return out;
  }

  get isNullable(): boolean {
    return this.cardinality == Cardinality.ATLEAST_0 || this.cardinality == Cardinality.ATMOST_1;
  }

  get isTerminal(): boolean {
    return this.value.isTerminal;
  }

  equals(another: Sym): boolean {
    if (this.cardinality != another.cardinality) return false;
    if (!this.value.equals(another.value)) return false;
    return true;
  }
}

export class Str extends Exp {
  readonly tag: IDType = IDType.STR;
  readonly isString: true;
  syms: Sym[];

  constructor(...syms: Sym[]) {
    super();
    this.syms = syms || [];
  }

  add(sym: Sym): void {
    this.syms.push(sym);
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
    }
    return true;
  }
}

export class Grammar {
  public startSymbol: Nullable<NonTerm> = null;
  private _modified = true;
  protected _terminals: Term[] = [];
  protected terminalsByName: StringMap<Term> = {};
  protected _nonTerminals: NonTerm[] = [];
  protected nonTerminalsByName: StringMap<NonTerm> = {};
  protected _auxNonTerminals: NonTerm[] = [];
  protected auxNonTerminalsByName: StringMap<NonTerm> = {};
  protected objsById: GObj[] = [];
  protected objsByType: GObj[][] = [[], [], [], [], [], [], []];
  protected currentNonTerm: Nullable<NonTerm> = null;

  readonly Eof = new Term("<EOF>");

  constructor() {
    this.wrapExp(this.Eof);
    for (let i = 0; i < IDType.MAX_TYPES; i++) {
      this.objsByType.push([]);
    }
  }

  /**
   * Return a terminal by its ID.
   */
  objById(id: number): Nullable<GObj> {
    return this.objsById[id] || null;
  }

  /**
   * Return an expression of a particular type given its index.
   */
  objByType(tag: IDType, index: number): Nullable<GObj> {
    return this.objsByType[tag][index] || null;
  }

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
   * Adds a new rule to a particular non terminal of the grammar
   * Each rule represents a production of the form:
   *
   * name -> A B C D;
   *
   * Null production can be represented with an empty exps list.
   */
  add(nt: string, production: Exp): this {
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
    if (this.isTerminal(label)) {
      return this.terminalsByName[label];
    } else if (this.isNT(label)) {
      return this.nonTerminalsByName[label];
    } else if (this.isAuxNT(label)) {
      return this.auxNonTerminalsByName[label];
    }
    return null;
  }

  getTerm(label: string, ensure = false): Nullable<NonTerm> {
    let lit = this.getLit(label);
    if (lit == null) {
      if (ensure) {
        lit = this.newTerm(label);
      }
    } else if (!lit.isTerminal) {
      return null;
    }
    return lit as NonTerm;
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
    const out = this.wrapExp(new Term(label));
    this.terminalsByName[label] = out;
    this._terminals.push(out);
    return out;
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
    const out = this.wrapExp(new NonTerm(label));
    out.isAuxiliary = isAuxiliary;
    if (isAuxiliary) {
      this.auxNonTerminalsByName[label] = out;
      this._auxNonTerminals.push(out);
    } else {
      this.nonTerminalsByName[label] = out;
      this._nonTerminals.push(out);
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
    return label in this.terminalsByName;
  }

  /**
   * Checks if a given label is a non-terminal.
   */
  isNT(label: string): boolean {
    return label in this.nonTerminalsByName;
  }

  /**
   * Checks if a given label is an auxiliary non-terminal.
   */
  isAuxNT(label: string): boolean {
    return label in this.auxNonTerminalsByName;
  }

  opt(exp: Exp | string): Exp {
    // Convert Opt into either a symbol *or* another Sym over an auxiliar
    // non-term
    const nexp = this.ensureSym(this.normalizeExp(exp));
    nexp.cardinality = Cardinality.ATMOST_1;
    return nexp;
  }

  atleast0(exp: Exp | string): Exp {
    const nexp = this.ensureSym(this.normalizeExp(exp));
    nexp.cardinality = Cardinality.ATLEAST_0;
    return nexp;
  }

  atleast1(exp: Exp | string): Exp {
    const nexp = this.ensureSym(this.normalizeExp(exp));
    nexp.cardinality = Cardinality.ATLEAST_1;
    return nexp;
  }

  seq(...exps: (Exp | string)[]): Exp {
    if (exps.length == 1) {
      return this.ensureSym(this.normalizeExp(exps[0]));
    } else {
      return this.wrapExp(new Str(...exps.map((e) => this.ensureSym(this.normalizeExp(e)))));
    }
  }

  anyof(...exps: (Exp | string)[]): Exp {
    if (exps.length == 1) {
      return this.ensureSym(this.normalizeExp(exps[0]));
    } else {
      // see if there is already NT with the exact set of rules
      // reuse if it exists.  That would make this method
      // Idempotent (which it needs to be).
      return this.ensureAuxNT(...(exps.map(e => this.normalizeExp(e))));
    }
  }

  protected wrapExp<T extends Exp>(exp: T): T {
    assert(exp.id < 0, "Expression already wrapped: " + exp.id);
    assert(exp.index < 0, "Expression already wrapped: " + exp.index);
    exp.grammar = this;
    exp.id = this.objsById.length;
    this.objsById.push(exp);

    exp.index = this.objsByType[exp.tag].length;
    this.objsByType[exp.tag].push(exp);
    return exp;
  }

  ensureSym(exp: Exp): Sym {
    if (exp.tag == IDType.STR) {
      const str = exp as Str;
      if (str.length == 1) {
        return str.syms[0];
      } else {
        return this.wrapExp(new Sym(this.ensureAuxNT(str)));
      }
    } else {
      return exp as Sym;
    }
  }

  normalizeExp(exp: Exp | string): Exp {
    if (typeof exp === "string") {
      const lit = this.getLit(exp);
      if (lit == null) throw new Error(`Invalid symbol: '${exp}'`);
      return this.wrapExp(new Sym(lit));
    } else if (exp.tag == IDType.TERM) {
      return this.wrapExp(new Sym(exp as Term));
    } else if (exp.tag == IDType.NON_TERM) {
      return this.wrapExp(new Sym(exp as NonTerm));
    } else {
      // We have an expression that needs to be fronted by an
      // auxiliarry non-terminal
      assert(exp.tag == IDType.STR || exp.tag == IDType.SYM, "Found tag: " + exp.tag);
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

  protected ensureAuxNT(...exps: Exp[]): NonTerm {
    let nt = this.findAuxNT(...exps);
    if (nt == null) {
      nt = this.newAuxNT();
      for (const exp of exps) nt.add(exp);
    }
    return nt;
  }

  /**
   * Find an auxiliary rule that has the same rules as the ones here.
   * This can be used to ensure duplicate rules are not created for
   * union expressions.
   */
  findAuxNT(...exps: Exp[]): Nullable<NonTerm> {
    for (const auxNT of this._auxNonTerminals) {
      if (auxNT.rulesEqual(exps)) return auxNT;
    }
    return null;
  }
}
