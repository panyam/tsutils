import { NumMap } from "../types";
import { Seq, Null, Grammar, Term, NonTerm, ExpType, Exp, ExpList, Opt, Atleast0, Atleast1 } from "./grammar";
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
      const e = this.grammar.expById(id);
      if (e != null && e.tag == ExpType.NON_TERM) out.push(e as NonTerm);
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
      this.grammar.nonTerminals.forEach((nt) => this.isNullable(nt));
    } while (beforeCount != this.entries.size);
  }

  isNullable(exp: Exp): boolean {
    if (exp.tag == ExpType.NULL) return true;
    if (!this.entries.has(exp.id) && !this.visited[exp.id]) {
      this.visited[exp.id] = true;
      let result = false;
      switch (exp.tag) {
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
          assert(false, "Unhandled expression type: " + exp.tag);
      }
      if (result) this.entries.add(exp.id);
    }
    return this.entries.has(exp.id);
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

  entriesFor(exp: Exp): TermSet {
    if (exp.id in this.entries) {
      return this.entries[exp.id];
    } else {
      const out = new TermSet(this.grammar);
      this.entries[exp.id] = out;
      return out;
    }
  }

  /**
   * Add the null symbol into this set of terminals for a given expression.
   */
  addNull(exp: Exp): boolean {
    return this.add(exp, Null);
  }

  /**
   * Add a Null, term or another expression to the set of terminals
   * for a given expression.  If source is an expression then all
   * of the source expression's terminal symbosl are added to exp's
   * term set.
   */
  add(exp: Exp, source: Exp, includeNull = true): boolean {
    if (!(exp.id in this.entries)) {
      this.entries[exp.id] = new TermSet(this.grammar);
    }
    const entries = this.entries[exp.id];
    if (source.tag == ExpType.NULL) {
      if (entries.hasNull) return false;
      // console.log(`Adding Null to Set of ${exp.id}`);
      entries.hasNull = true;
    } else if (source.tag == ExpType.TERM) {
      const term = source as Term;
      if (entries.has(term)) return false;
      // console.log(`Adding Term(${term.label}) to Set of ${exp.id}`);
      entries.add(term);
      this._count++;
    } else {
      const srcEntries = this.entriesFor(source);
      const destEntries = this.entriesFor(exp);
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

  constructor(grammar: Grammar, nullables: NullableSet) {
    super(grammar);
    this.nullables = nullables;
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
      this.grammar.nonTerminals.forEach((nt) => this.visit(nt, {}));
    } while (beforeCount != this.count);
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
    switch (exp.tag) {
      case ExpType.NULL:
        // Nothing
        this.addNull(parent);
        break;
      case ExpType.TERM:
        this.add(parent, exp as Term);
        break;
      case ExpType.NON_TERM:
        // Do nothing
        // this.visit(exp as NonTerm, populated);
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
        assert(false, "Unhandled expression type: " + exp.tag);
    }
    this.add(parent, exp, this.nullables.isNullable(exp));
  }
}

/**
 * For each symbol maps its label to a list of terminals that
 * start that non terminal.
 */
export class FollowSets extends NonTermTermSets {
  readonly firstSets: FirstSets;
  readonly cumFirstSets: FirstSets;

  constructor(grammar: Grammar, firstSets: FirstSets) {
    super(grammar);
    this.firstSets = firstSets;
    this.cumFirstSets = new FirstSets(grammar, firstSets.nullables);
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
      for (const nt of g.nonTerminals) {
        this.processRule(nt, nt.rules);
        // console.log("NT: ", nt.label, ", FS: ", this.entriesFor(nt).labels);
      }
    } while (beforeCount != this.count);
  }

  /**
   * Add Follows[source] into Follows[dest] recursively.
   */
  processRule(parent: Exp, exp: Exp): void {
    switch (exp.tag) {
      case ExpType.NULL:
        // Do nothing
        break;
      case ExpType.OPTIONAL:
        this.add(exp, parent);
        this.processRule(exp, (exp as Opt).exp);
        break;
      case ExpType.ATLEAST_0:
        this.add(exp, parent);
        this.processRule(exp, (exp as Atleast0).exp);
        break;
      case ExpType.ATLEAST_1:
        this.add(exp, parent);
        this.processRule(exp, (exp as Atleast1).exp);
        break;
      case ExpType.ANY_OF:
        this.add(exp, parent);
        for (const e of (exp as ExpList).exps) {
          this.processRule(exp, e);
        }
        break;
      case ExpType.TERM:
        // Do nothing
        break;
      case ExpType.NON_TERM:
        // Do nothing?
        this.add(exp, parent);
        break;
      case ExpType.SEQ:
        const exps = (exp as ExpList).exps;
        const firstSets = this.firstSets;
        const nullables = this.firstSets.nullables;

        // recurse first if there are any rules
        for (let i = 0; i < exps.length - 1; i++) {
          this.processRule(exp, exps[i]);
        }

        // Rule 1:
        //  If A -> aBb1b2b3..bn:
        //    Follow(B) = Follow(B) U { First(b1b2b3...bn) - eps }
        for (let i = 0; i < exps.length - 1; i++) {
          if (exps[i].tag != ExpType.NULL && exps[i].tag != ExpType.TERM) {
            const entries = this.entriesFor(exps[i]);
            // This needs to be memoized
            for (let j = i + 1; j < exps.length; j++) {
              firstSets.entriesFor(exps[j]).addTo(entries, false);
              if (!nullables.isNullable(exps[j])) break;
            }
          }
        }

        // Rule 2:
        //  If A -> aBb1b2b3..bn:
        //    if Nullable(b1b2b3...bn):
        //      Follow(B) = Follow(B) U Follow(N)
        for (let i = exps.length - 1; i >= 0; i--) {
          // This needs to be memoized??
          let allNullable = true;
          for (let j = i + 1; j < exps.length; j++) {
            if (!nullables.isNullable(exps[j])) {
              allNullable = false;
              break;
            }
          }
          if (allNullable) {
            this.add(exps[i], parent);
          }
        }
        break;
      default:
        assert(false, "Unhandled expression type: " + exp.tag);
    }
  }
}
