import { NumMap } from "../types";
import { Null, Grammar, Term, NonTerm, ExpType, Exp, ExpList, Opt, Atleast0, Atleast1 } from "./grammar";
import { assert } from "../utils/misc";

export class TermSet {
  readonly grammar: Grammar;
  entries = new Set<number>();
  hasNull = false;

  constructor(grammar: Grammar) {
    this.grammar = grammar;
  }

  get labels(): string[] {
    const out: string[] = [];
    for (const i of this.entries) {
      const exp = this.grammar.expById(i) as Term;
      assert(exp != null);
      out.push(exp.label);
    }
    if (this.hasNull) out.push("");
    return out;
  }

  addTo(another: TermSet): number {
    const before = another.entries.size;
    for (const termid of this.entries) {
      another.entries.add(termid);
    }
    another.hasNull = this.hasNull || another.hasNull;
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
      const e = this.grammar.expById(id);
      if (e != null && e.type == ExpType.NON_TERM) out.push(e as NonTerm);
    });
    return out;
  }

  refresh(): void {
    // Nuke entries cache.  Will force isNullable to recompute.
    this.entries = new Set();
    this.visited = {};

    while (true) {
      const beforeCount = this.entries.size;
      this.grammar.nonTerminals.forEach((nt) => this.isNullable(nt));
      if (beforeCount == this.entries.size) {
        // no more first set entries found
        break;
      }
    }
  }

  isNullable(exp: Exp): boolean {
    if (exp.type == ExpType.NULL) return true;
    if (!this.entries.has(exp.id) && !this.visited[exp.id]) {
      this.visited[exp.id] = true;
      let result = false;
      switch (exp.type) {
        case ExpType.TERM:
          result = false;
          break;
        case ExpType.NON_TERM:
          result = this.isNullable((exp as NonTerm).rules);
          break;
        case ExpType.OPTIONAL:
          result = true;
          break;
        case ExpType.ATLEAST_0:
          result = true;
          break;
        case ExpType.ATLEAST_1:
          result = this.isNullable((exp as Atleast1).exp);
          break;
        case ExpType.ANY_OF:
          result = (exp as ExpList).length == 0;
          if (!result) {
            for (const e of (exp as ExpList).exps) {
              result = this.isNullable(e);
              if (result) {
                break;
              }
            }
          }
          break;
        case ExpType.SEQ:
          result = true;
          for (const e of (exp as ExpList).exps) {
            result = this.isNullable(e);
            if (!result) break;
          }
          break;
        default:
          console.log("Unhandled expression type: ", exp);
          assert(false, "Unhandled expression type: " + exp.type);
      }
      if (result) this.entries.add(exp.id);
    }
    return this.entries.has(exp.id);
  }
}

/**
 * For each symbol maps its label to a list of terminals that
 * start that non terminal.
 */
export class FirstSets {
  readonly grammar: Grammar;
  readonly nullables: NullableSet;
  entries: NumMap<TermSet> = {};
  private _count = 0;

  constructor(grammar: Grammar, nullables: NullableSet) {
    this.grammar = grammar;
    this.nullables = nullables;
    this.refresh();
  }

  /*
  get nonterms(): NumMap<NonTerm[]> {
    const out: NumMap<NonTerm[]> = {};
    for (const id in this.entries) {
      const i = parseInt(id);
      out[i] = [];
      const e = this.grammar.expById(parseInt(id));
      if (e != null && e.type == ExpType.NON_TERM) out[i].push(e as NonTerm);
    }
    return out;
  }
  */

  get count(): number {
    let c = 0;
    for (const x in this.entries) c += this.entries[x].size;
    return c;
    // assert(c == this._count, "Count mismatch")
    // return this._count;
  }

  entriesFor(exp: Exp): TermSet {
    if (exp.id in this.entries) {
      return this.entries[exp.id];
    } else {
      const out = new TermSet(this.grammar);
      this.entries[exp.id] = out;
      return out;
    }
  }

  addNull(exp: Exp): boolean {
    if (!(exp.id in this.entries)) {
      this.entries[exp.id] = new TermSet(this.grammar);
    }
    const entries = this.entries[exp.id];
    if (entries.hasNull) return false;
    entries.hasNull = true;
    this._count++;
    return true;
  }

  add(exp: Exp, term: Term): boolean {
    if (!(exp.id in this.entries)) {
      this.entries[exp.id] = new TermSet(this.grammar);
    }
    const entries = this.entries[exp.id];
    if (entries.has(term)) return false;
    entries.add(term);
    this._count++;
    return true;
  }

  /**
   * Adds all entries in ntFrom's firstSet into the firstSet of ntTo.
   */
  addTo(ntTo: Exp, ntFrom: Exp): number {
    const srcEntries = this.entriesFor(ntFrom);
    const destEntries = this.entriesFor(ntTo);
    const count = srcEntries.addTo(destEntries);
    this._count += count;
    return count;
  }

  /**
   * Reevaluates the first sets of a grammar.
   * This method assumes that the grammar's nullables are fresh.
   */
  refresh(): void {
    this.entries = {};
    this._count = 0;
    this.grammar.terminals.forEach((t) => this.add(t, t));

    while (true) {
      const beforeCount = this.count;
      this.grammar.nonTerminals.forEach((nt) => this.visit(nt, {}));
      if (beforeCount == this.count) {
        // no more first set entries found
        break;
      }
    }
  }

  // Here we start with each NT and in a Depth First manner process
  // its rules to extract its first sets.
  // This method is co-recursive with the processRule method
  // that calls back this method when it encounters a new non
  // terminal in one of its production rules.
  protected visit(nonterm: NonTerm, populated: NumMap<NonTerm>): void {
    // Only process its rules if it has not already been processed
    if (!(nonterm.id in populated)) {
      populated[nonterm.id] = nonterm;
      this.processRule(nonterm, nonterm.rules, populated);
    }
  }

  processRule(parent: Exp, exp: Exp, populated: NumMap<NonTerm>): void {
    switch (exp.type) {
      case ExpType.NULL:
        // Nothing
        this.addNull(parent);
        break;
      case ExpType.TERM:
        this.add(parent, exp as Term);
        break;
      case ExpType.NON_TERM:
        this.visit(exp as NonTerm, populated);
        break;
      case ExpType.OPTIONAL:
        this.addNull(parent);
        this.processRule(exp, (exp as Opt).exp, populated);
        break;
      case ExpType.ATLEAST_0:
        this.addNull(parent);
        this.processRule(exp, (exp as Atleast0).exp, populated);
        break;
      case ExpType.ATLEAST_1:
        this.processRule(exp, (exp as Atleast1).exp, populated);
        break;
      case ExpType.ANY_OF:
        for (const e of (exp as ExpList).exps) {
          this.processRule(exp, e, populated);
        }
        break;
      case ExpType.SEQ:
        const exps = (exp as ExpList).exps;
        const nullables = this.nullables;
        for (const e of exps) {
          // First(e) will be in First(nonterm)
          this.processRule(exp, e, populated);
          if (!nullables.isNullable(e)) {
            // since e is not nullable the next rule's first set
            // cannot affect nonterm's firs set
            break;
          }
        }
        break;
      default:
        assert(false, "Unhandled expression type: " + exp.type);
    }
    this.addTo(parent, exp);
  }
}

/**
 * For each symbol maps its label to a list of terminals that
 * start that non terminal.
 */
export class FollowSets {
  readonly grammar: Grammar;
  readonly firstSets: FirstSets;
  entries: NumMap<TermSet> = {};
  private _count = 0;

  constructor(grammar: Grammar, firstSets: FirstSets) {
    this.grammar = grammar;
    this.firstSets = firstSets;
    this.refresh();
  }

  get count(): number {
    return this._count;
  }

  entriesFor(exp: Exp): TermSet {
    return this.entries[exp.id];
  }

  addNull(exp: Exp): boolean {
    if (!(exp.id in this.entries)) {
      this.entries[exp.id] = new TermSet(this.grammar);
    }
    const entries = this.entries[exp.id];
    if (entries.hasNull) return false;
    entries.hasNull = true;
    this._count++;
    return true;
  }

  add(exp: Exp, term: Term): boolean {
    if (!(exp.id in this.entries)) {
      this.entries[exp.id] = new TermSet(this.grammar);
    }
    const entries = this.entries[exp.id];
    if (!entries.has(term)) return false;
    entries.add(term);
    this._count++;
    return true;
  }

  /**
   * Adds all entries in ntFrom's firstSet into the firstSet of ntTo.
   */
  addFrom(ntFrom: Exp, ntTo: Exp): number {
    const srcEntries = this.entries[ntFrom.id];
    const destEntries = this.entries[ntTo.id];
    const count = srcEntries.addTo(destEntries);
    this._count += count;
    return count;
  }

  /**
   * Reevaluates the follow sets of each expression in our grammar.
   * This method assumes that the grammar's nullables and firstSets are
   * up-to-date.
   */
  refresh(): void {
    this.entries = {};
    this._count = 0;
    const g = this.grammar;
    this.add(g.startSymbol!, g.Eof);

    while (true) {
      const beforeCount = this.count;
      for (const nt of g.nonTerminals) {
        this.visit(nt, {});
      }
      if (beforeCount == this.count) {
        // no more first set entries found
        break;
      }
    }
  }

  visit(nt: NonTerm, visited: any): void {
    if (!visited[nt.id]) {
      visited[nt.id] = true;
      this.processRule(nt, nt.rules);
    }
  }

  /**
   * Add Follows[source] into Follows[dest] recursively.
   */
  processRule(parent: Exp, exp: Exp): void {
    switch (exp.type) {
      case ExpType.TERM:
        // Do nothing
        break;
      case ExpType.NON_TERM:
        // Do nothing
        this.addFrom(parent, exp);
        break;
      case ExpType.OPTIONAL:
        this.addFrom(parent, exp);
        this.processRule(exp, (exp as Opt).exp);
        break;
      case ExpType.ATLEAST_0:
        this.addFrom(parent, exp);
        this.processRule(exp, (exp as Atleast0).exp);
        break;
      case ExpType.ATLEAST_1:
        this.addFrom(parent, exp);
        this.processRule(exp, (exp as Atleast1).exp);
        break;
      case ExpType.ANY_OF:
        this.addFrom(parent, exp);
        for (const e of (exp as ExpList).exps) {
          this.processRule(exp, e);
        }
        break;
      case ExpType.SEQ:
        const exps = (exp as ExpList).exps;
        const firstSets = this.firstSets;

        // Rule 1 (i == exps.length - 1):
        //  If A -> a B:
        //    Follow(A) -> Follow(B)
        //
        // Rule 2 (Null.id in firsts):
        //  If A -> aBb and eps is in First(b):
        //    Follow(A) -> Follow(B)
        for (let i = exps.length - 1; i >= 0; i--) {
          const expi = exps[i];
          const firsts = firstSets.entriesFor(expi);
          if (i == exps.length - 1 || Null.id in firsts) {
            this.addFrom(expi, parent);
          } else {
            break;
          }
        }

        // Rule 3:
        //  If A -> aBb:
        //    { First(b) - eps } -> Follow(B)
        for (let i = exps.length - 1; i > 0; i--) {
          const expi = exps[i];
          const firsts = firstSets.entriesFor(expi);
          const expi1 = exps[i - 1];
          firsts.addTo(this.entriesFor(expi1));
        }
        break;
      default:
        assert(false, "Unhandled expression type");
    }
  }
}
