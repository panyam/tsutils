import { NonTerm, Term, Exp, Sym, Str, Grammar } from "./grammar";
import { FollowSets } from "./sets";
import { Tokenizer } from "./tokenizer";
import { PTNode, Parser as ParserBase } from "./parser";
import { Nullable } from "../types";
import { assert } from "../utils/misc";

type EntryType = [NonTerm, number, number];
export class ParseTable {
  readonly grammar: Grammar;
  protected entries: Map<number, Map<number, EntryType[]>>;
  followSets: FollowSets;

  constructor(grammar: Grammar, followSets?: FollowSets) {
    this.grammar = grammar;
    this.followSets = followSets || new FollowSets(grammar);
    this.refresh();
  }

  refresh(): void {
    this.entries = new Map();
    this.followSets.refresh();
  }

  get count(): number {
    let c = 0;
    for (const nt of this.entries.values()) {
      for (const term of nt.values()) {
        c += term.length;
      }
    }
    return c;
  }

  ensureEntry(nt: NonTerm, term: Term): EntryType[] {
    let entriesForNT = this.entries.get(nt.id) as Map<number, EntryType[]>;
    if (!entriesForNT) {
      entriesForNT = new Map();
      this.entries.set(nt.id, entriesForNT);
    }
    let entries = entriesForNT.get(term.id) as EntryType[];
    if (!entries) {
      entries = [];
      entriesForNT.set(term.id, entries);
    }
    return entries;
  }

  add(nt: NonTerm, term: Term, entry: EntryType): boolean {
    const entries = this.ensureEntry(nt, term);
    entries.push(entry);
    return entries.length == 1;
  }

  get(nt: NonTerm, term: Term): EntryType[] {
    return this.ensureEntry(nt, term);
  }
}

export class LL1ParseTable extends ParseTable {
  refresh(): void {
    super.refresh();
    this.grammar.forEachRule((nt, rule, index) => {
      this.processRule(nt, rule, index);
    });
  }

  processRule(nt: NonTerm, rule: Exp, index: number): void {
    const firstSets = this.followSets.firstSets;
    // Rule 1
    // For each a in First(rule) add A -> rule to M[A,a]
    let ruleIsNullable = false;
    firstSets.forEachTermIn(rule, 0, (term) => {
      if (term == null) {
        ruleIsNullable = true;
      } else {
        this.add(nt, term, [nt, index, 0]);
      }
    });

    // Rule 2
    // if rule is nullable then A -> rule to M[A,b] for each b in Follow(A)
    // Also if EOF in Follow(A) then add A -> Rule to M[A,Eof]
    // const nullables = this.followSets.nullables;
    // const nullable = rule.isString ? nullables.isStrNullable(rule as Str) : nullables.isNullable((rule as Sym).value);
    if (ruleIsNullable) {
      this.followSets.forEachTerm(nt, (term) => {
        assert(term != null, "Follow sets cannot have null");
        this.add(nt, term, [nt, index, 0]);
      });
    }
  }
}

export class LLParser extends ParserBase {
  parseTable: ParseTable;
  constructor(grammar: Grammar, tokenizer: Tokenizer, parseTable: ParseTable) {
    super(grammar, tokenizer);
    this.parseTable = parseTable;
  }

  parse(): Nullable<PTNode> {
    /*
    const stack = [];
    const tokenizer = this.tokenizer;
    while (true) {
      const topItem = stack.top();
      const a = tokenizer.peek();
      if (topItem.isTerminal == ExpType.TERM or topItem == grammar.Eof) {
        if (topItem == a) {
          tokenizer.next();
          stack.pop();
        } else {
          error();
        }
      } else {
        const (exp, prod) = parseTable.get(topItem, a));
        if (exp == null) error();
        else {
          stack.pop();
          stack.push(prod);
          emit(exp, prod);
        }
      }
      if (topItem == grammar.Eof) break;
    }
    */
    return null;
  }
}
