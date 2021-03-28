import { StringMap, NumMap, Nullable } from "../types";
import { Grammar, Sym, Str } from "./grammar";
import { assert } from "../utils/misc";

const defaultKeyFunc = (x: any) => x.key;

export class IDSet<T extends { id: number }> {
  protected _entries: T[] = [];
  protected _entriesByKey: StringMap<T> = {};
  protected keyFunc: (t: T) => string;

  constructor(keyFunc: (t: T) => string = defaultKeyFunc) {
    this.keyFunc = keyFunc;
  }

  clear(): void {
    this._entries = [];
    this._entriesByKey = {};
  }

  get entries(): ReadonlyArray<T> {
    return this._entries;
  }

  get(id: number): Nullable<T> {
    return this._entries[id] || null;
  }

  getByKey(key: string): Nullable<T> {
    return this._entriesByKey[key] || null;
  }

  ensure(entry: T, throwIfExists = false): T {
    // see if this itemset exists
    if (this.has(entry)) {
      if (throwIfExists) throw new Error(`Entry ${this.keyFunc(entry)} already exists`);
      return this._entriesByKey[this.keyFunc(entry)];
    } else {
      this._entriesByKey[this.keyFunc(entry)] = entry;
      entry.id = this._entries.length;
      this._entries.push(entry);
    }
    return entry;
  }

  has(entry: T): boolean {
    return this.keyFunc(entry) in this._entriesByKey;
  }

  get size(): number {
    return this._entries.length;
  }
}

export class TermSet {
  readonly grammar: Grammar;
  entries = new Set<number>();
  hasNull = false;

  constructor(grammar: Grammar) {
    this.grammar = grammar;
  }

  get debugString(): string {
    return "<" + this.labels().sort().join(", ") + ">";
  }

  labels(skipAux = false): string[] {
    const out: string[] = [];
    for (const i of this.entries) {
      const exp = this.grammar.getSymById(i);
      assert(exp != null);
      if (!skipAux || !exp.isAuxiliary) out.push(exp.label);
    }
    if (this.hasNull) out.push("");
    return out;
  }

  addFrom(another: TermSet, includeNull = true): number {
    return another.addTo(this, includeNull);
  }

  addTo(another: TermSet, includeNull = true): number {
    const before = another.entries.size;
    for (const termid of this.entries) {
      another.entries.add(termid);
    }
    if (includeNull) {
      another.hasNull = this.hasNull || another.hasNull;
    }
    return another.entries.size - before;
  }

  has(term: Sym): boolean {
    return this.entries.has(term.id);
  }

  add(term: Sym): this {
    assert(term.isTerminal);
    this.entries.add(term.id);
    return this;
  }

  delete(term: Sym): boolean {
    return this.entries.delete(term.id);
  }

  get size(): number {
    return this.entries.size + (this.hasNull ? 1 : 0);
  }
}

/**
 * Tells which non terminals are nullables.
 */
export class NullableSet {
  readonly grammar: Grammar;
  entries: Set<number>;
  private visited: any;

  constructor(grammar: Grammar) {
    this.grammar = grammar;
    this.refresh();
  }

  get nonterms(): Sym[] {
    const out: Sym[] = [];
    this.entries.forEach((id) => {
      const e = this.grammar.getSymById(id);
      assert(e != null && !e.isTerminal);
      out.push(e);
    });
    return out;
  }

  refresh(): void {
    // Nuke entries cache.  Will force isNullable to recompute.
    this.entries = new Set();
    this.visited = {};

    let beforeCount = 0;
    do {
      beforeCount = this.entries.size;
      this.grammar.forEachRule((nt) => this.visit(nt));
    } while (beforeCount != this.entries.size);
  }

  protected visit(nt: Sym): void {
    if (nt.rules.length > 0) {
      for (const rule of nt.rules) {
        if (this.evaluate(rule)) {
          this.add(nt);
          break;
        }
      }
    }
  }

  isNullable(nt: Sym): boolean {
    return !nt.isTerminal && this.entries.has(nt.id);
  }

  isStrNullable(str: Str, fromIndex = 0, toIndex: Nullable<number> = null): boolean {
    if (toIndex == null) {
      toIndex = str.length - 1;
    }
    for (let i = fromIndex; i <= toIndex; i++) {
      if (!this.isNullable(str.syms[i])) {
        return false;
      }
    }
    return true;
  }

  add(nt: Sym): void {
    assert(!nt.isTerminal);
    this.entries.add(nt.id);
  }

  protected evaluate(exp: Str): boolean {
    return this.isStrNullable(exp);
  }
}

class SymTermSets {
  readonly grammar: Grammar;
  entries: NumMap<TermSet> = {};
  private _count = 0;

  constructor(grammar: Grammar) {
    this.grammar = grammar;
  }

  refresh(): void {
    this.entries = {};
    this._count = 0;
  }

  forEachTerm(nt: Sym, visitor: (x: Nullable<Sym>) => boolean | void): void {
    const entries = this.entriesFor(nt);
    entries.entries.forEach((x) => {
      const term = this.grammar.getSymById(x);
      assert(term != null && term.isTerminal);
      visitor(term);
    });
    if (entries.hasNull) visitor(null);
  }

  get debugString(): any {
    const out = {} as any;
    for (const x in this.entries) out[this.grammar.getSymById(x as any)!.label] = this.entries[x].debugString;
    return out;
  }

  get count(): number {
    let c = 0;
    for (const x in this.entries) c += this.entries[x].size;
    return c;
    // assert(c == this._count, "Count mismatch")
    // return this._count;
  }

  entriesFor(sym: Sym): TermSet {
    if (sym.id in this.entries) {
      return this.entries[sym.id];
    } else {
      const out = new TermSet(this.grammar);
      this.entries[sym.id] = out;
      return out;
    }
  }

  /**
   * Add the null symbol into this set of terminals for a given expression.
   */
  addNull(nt: Sym): boolean {
    const entries = this.entriesFor(nt);
    if (entries.hasNull) return false;
    entries.hasNull = true;
    return true;
  }

  /**
   * Add a Null, term or another expression to the set of terminals
   * for a given expression.  If source is an expression then all
   * of the source expression's terminal symbosl are added to exp's
   * term set.
   */
  add(nt: Sym, source: Sym, includeNull = true): boolean {
    if (nt.isTerminal) {
      assert(false, "Should not be here");
    }
    const entries = this.entriesFor(nt);
    if (source.isTerminal) {
      if (entries.has(source)) return false;
      // console.log(`Adding Term(${term.label}) to Set of ${exp.id}`);
      entries.add(source);
      this._count++;
    } else {
      const srcEntries = this.entriesFor(source);
      const destEntries = this.entriesFor(nt);
      const count = srcEntries.addTo(destEntries, includeNull);
      this._count += count;
    }
    return true;
  }
}

/**
 * For each symbol maps its label to a list of terminals that
 * start that non terminal.
 */
export class FirstSets extends SymTermSets {
  readonly nullables: NullableSet;

  constructor(grammar: Grammar, nullables?: NullableSet) {
    super(grammar);
    if (!nullables) {
      nullables = new NullableSet(grammar);
    }
    this.nullables = nullables;
    this.refresh();
  }

  /**
   * For a given string return the first(str) starting at a given index.
   * Including eps if it exists.
   */
  forEachTermIn(str: Str, fromIndex = 0, visitor: (term: Nullable<Sym>) => void): void {
    // This needs to be memoized by exp.id + index
    const syms = str.syms;
    const visited = {} as any;
    let allNullable = true;
    for (let j = fromIndex; allNullable && j < syms.length; j++) {
      const symj = syms[j];
      if (symj.isTerminal) {
        visitor(symj);
        allNullable = false;
      } else {
        const nt = symj as Sym;
        this.forEachTerm(nt, (term) => {
          if (term != null && !(term.id in visited)) {
            visited[term.id] = true;
            visitor(term);
          }
        });
        if (!this.nullables.isNullable(symj as Sym)) {
          allNullable = false;
        }
      }
    }
    if (allNullable) visitor(null);
  }

  /**
   * Reevaluates the first sets of a grammar.
   * This method assumes that the grammar's nullables are fresh.
   */
  refresh(): void {
    super.refresh();
    // this.grammar.terminals.forEach((t) => this.add(t, t));

    let beforeCount = 0;
    do {
      beforeCount = this.count;
      this.grammar.forEachRule((nt, exp) => {
        this.processRule(nt, exp);
      });
    } while (beforeCount != this.count);
  }

  processRule(nonterm: Sym, rule: Str): void {
    const nullables = this.nullables;
    let allNullable = true;
    for (const s of rule.syms) {
      // First(s) - null will be in First(nonterm)
      // Null will onlybe added if all symbols are nullable
      this.add(nonterm, s, false);
      if (s.isTerminal || !nullables.isNullable(s as Sym)) {
        // since s is not nullable the next rule's first set
        // cannot affect nonterm's firs set
        allNullable = false;
        break;
      }
    }
    if (allNullable) this.addNull(nonterm);
  }
}

/**
 * For each symbol maps its label to a list of terminals that
 * start that non terminal.
 */
export class FollowSets extends SymTermSets {
  readonly firstSets: FirstSets;

  constructor(grammar: Grammar, firstSets?: FirstSets) {
    super(grammar);
    this.firstSets = firstSets || new FirstSets(grammar);
    this.refresh();
  }

  get nullables(): NullableSet {
    return this.firstSets.nullables;
  }

  /**
   * Reevaluates the follow sets of each expression in our grammar.
   * This method assumes that the grammar's nullables and firstSets are
   * up-to-date.
   */
  refresh(): void {
    super.refresh();
    const g = this.grammar;
    assert(g.startSymbol != null, "Select start symbol of the grammar");
    this.add(g.startSymbol, g.Eof);

    // Augmented start symbol
    // const augStart = new Sym("");
    // augStart.add(new Seq(g.startSymbol, g.Eof));

    let beforeCount = 0;
    do {
      beforeCount = this.count;
      this.grammar.forEachRule((nt, rule) => this.processRule(nt, rule));
    } while (beforeCount != this.count);
  }

  /**
   * Add Follows[source] into Follows[dest] recursively.
   */
  processRule(nonterm: Sym, rule: Str): void {
    const syms = rule.syms;
    const firstSets = this.firstSets;
    const nullables = this.firstSets.nullables;

    // Rule 1:
    //  If A -> aBb1b2b3..bn:
    //    Follow(B) = Follow(B) U { First(b1b2b3...bn) - eps }
    for (let i = 0; i < syms.length; i++) {
      const sym = syms[i];
      if (sym.isTerminal) continue;
      firstSets.forEachTermIn(rule, i + 1, (term) => {
        if (term != null) this.add(sym, term);
      });
    }

    // Rule 2:
    //  If A -> aBb1b2b3..bn:
    //    if Nullable(b1b2b3...bn):
    //      Follow(B) = Follow(B) U Follow(N)
    for (let i = syms.length - 1; i >= 0; i--) {
      if (syms[i].isTerminal) continue;

      // This needs to be memoized??
      let allNullable = true;
      for (let j = i + 1; j < syms.length; j++) {
        const symj = syms[j];
        if (symj.isTerminal || !nullables.isNullable(symj as Sym)) {
          allNullable = false;
          break;
        }
      }
      if (allNullable) {
        this.add(syms[i], nonterm);
      }
    }
  }
}
