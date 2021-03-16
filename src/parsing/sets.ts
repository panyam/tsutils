import { NumMap } from "../types";
import { Grammar, Lit, Term, NonTerm, IDType, Exp, Sym, Str } from "./grammar";
import { assert } from "../utils/misc";

export class TermSet {
  readonly grammar: Grammar;
  entries = new Set<number>();
  hasNull = false;

  constructor(grammar: Grammar) {
    this.grammar = grammar;
  }

  labels(skipAux = false): string[] {
    const out: string[] = [];
    for (const i of this.entries) {
      const exp = this.grammar.objById(i) as Lit;
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

  has(term: Term): boolean {
    return this.entries.has(term.id);
  }

  add(term: Term): this {
    this.entries.add(term.id);
    return this;
  }

  delete(term: Term): boolean {
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

  get nonterms(): NonTerm[] {
    const out: NonTerm[] = [];
    this.entries.forEach((id) => {
      const e = this.grammar.objById(id);
      if (e != null && e.tag == IDType.NON_TERM) out.push(e as NonTerm);
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
      this.grammar.forEachNT((nt) => this.visit(nt));
    } while (beforeCount != this.entries.size);
  }

  protected visit(nt: NonTerm): void {
    const rules = nt.rules;
    let nullable = nt.rules.length == 0 || nt.hasNull;
    if (!nullable) {
      for (const rule of nt.rules) {
        if (this.evaluate(rule)) {
          nullable = true;
          break;
        }
      }
    }
    if (nullable) this.add(nt);
  }

  isNullable(nt: NonTerm): boolean {
    return nt.id in this.entries;
  }

  add(nt: NonTerm): void {
    this.entries.add(nt.id);
  }

  protected evaluate(exp: Exp): boolean {
    if (exp.isString) {
      for (const e of (exp as Str).syms) {
        if (!this.evaluate(e)) return false;
      }
      return true;
    } else {
      const sym = exp as Sym;
      return sym.isNullable;
    }
  }
}

class NonTermTermSets {
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

  get count(): number {
    let c = 0;
    for (const x in this.entries) c += this.entries[x].size;
    return c;
    // assert(c == this._count, "Count mismatch")
    // return this._count;
  }

  entriesFor(lit: Lit): TermSet {
    if (lit.id in this.entries) {
      return this.entries[lit.id];
    } else {
      const out = new TermSet(this.grammar);
      this.entries[lit.id] = out;
      return out;
    }
  }

  /**
   * Add the null symbol into this set of terminals for a given expression.
   */
  addNull(nt: NonTerm): boolean {
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
  add(nt: Lit, source: Lit, includeNull = true): boolean {
    const entries = this.entriesFor(nt);
    if (source.isTerminal) {
      const term = source as Term;
      if (entries.has(term)) return false;
      // console.log(`Adding Term(${term.label}) to Set of ${exp.id}`);
      entries.add(term);
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
export class FirstSets extends NonTermTermSets {
  readonly nullables: NullableSet;

  constructor(grammar: Grammar, nullables?: NullableSet) {
    super(grammar);
    this.nullables = nullables || new NullableSet(grammar);
    this.refresh();
  }

  /**
   * Reevaluates the first sets of a grammar.
   * This method assumes that the grammar's nullables are fresh.
   */
  refresh(): void {
    super.refresh();
    this.grammar.terminals.forEach((t) => this.add(t, t));

    let beforeCount = 0;
    do {
      beforeCount = this.count;
      this.grammar.forEachNT((nt) => this.visit(nt));
    } while (beforeCount != this.count);
  }

  protected visit(nt: NonTerm): void {
    if (nt.hasNull) {
      this.addNull(nt);
    } else {
      for (const rule of nt.rules) {
        this.processRule(nt, rule);
      }
    }
  }

  processRule(nonterm: NonTerm, exp: Exp): void {
    if (exp.isString) {
      const str = exp as Str;
      const nullables = this.nullables;
      for (const s of str.syms) {
        // First(s) will be in First(nonterm)
        this.add(nonterm, s.value, true);
        if (!s.isTerminal && !nullables.isNullable(s.value as NonTerm)) {
          // since s is not nullable the next rule's first set
          // cannot affect nonterm's firs set
          break;
        }
      }
    } else {
      const sym = exp as Sym;
      this.add(nonterm, sym.value, true);
    }
  }
}

/**
 * For each symbol maps its label to a list of terminals that
 * start that non terminal.
 */
export class FollowSets extends NonTermTermSets {
  readonly firstSets: FirstSets;

  constructor(grammar: Grammar, firstSets?: FirstSets) {
    super(grammar);
    this.firstSets = firstSets || new FirstSets(grammar);
    this.refresh();
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
    // const augStart = new NonTerm("");
    // augStart.add(new Seq(g.startSymbol, g.Eof));

    let beforeCount = 0;
    do {
      beforeCount = this.count;
      this.grammar.forEachNT((nt) => this.visit(nt));
    } while (beforeCount != this.count);
  }

  protected visit(nt: NonTerm): void {
    if (nt.hasNull) {
      this.addNull(nt);
    } else {
      for (const rule of nt.rules) {
        this.processRule(nt, rule);
      }
    }
  }

  /**
   * Add Follows[source] into Follows[dest] recursively.
   */
  processRule(nonterm: NonTerm, exp: Exp): void {
    const nullables = this.firstSets.nullables;
    if (exp.isString) {
      const str = exp as Str;
      const syms = str.syms;
      const firstSets = this.firstSets;
      const nullables = this.firstSets.nullables;

      // Rule 1:
      //  If A -> aBb1b2b3..bn:
      //    Follow(B) = Follow(B) U { First(b1b2b3...bn) - eps }
      for (let i = 0; i < syms.length - 1; i++) {
        const sym = syms[i];
        if (!sym.isTerminal) {
          const entries = this.entriesFor(sym.value);
          // This needs to be memoized
          for (let j = i + 1; j < syms.length; j++) {
            const symj = syms[j];
            firstSets.entriesFor(symj.value).addTo(entries, false);
            if (symj.isTerminal) break;
            if (!nullables.isNullable(symj.value as NonTerm)) break;
          }
        }
      }

      // Rule 2:
      //  If A -> aBb1b2b3..bn:
      //    if Nullable(b1b2b3...bn):
      //      Follow(B) = Follow(B) U Follow(N)
      for (let i = syms.length - 1; i >= 0; i--) {
        // This needs to be memoized??
        let allNullable = true;
        for (let j = i + 1; j < syms.length; j++) {
          const symj = syms[j];
          if (symj.isTerminal) break;
          if (symj.isTerminal || !nullables.isNullable(symj.value as NonTerm)) {
            allNullable = false;
            break;
          }
        }
        if (allNullable) {
          this.add(syms[i].value, nonterm);
        }
      }
    } else {
      const sym = exp as Sym;
      if (!sym.isTerminal) {
        this.add(sym.value, nonterm);
      }
    }
  }
}
