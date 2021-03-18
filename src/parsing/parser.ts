import { Nullable } from "../types";
import { Token } from "./tokenizer";
import { Sym, Str, Grammar } from "./grammar";
import { FollowSets } from "./sets";
import { assert } from "../utils/misc";

type NodeType = number | string;

/**
 * A tokenizer interface used by our parser.
 */
export interface Tokenizer {
  peek(): Nullable<Token>;
  next(): Nullable<Token>;
}

export abstract class PTNode {
  readonly sym: Sym;
  parent: Nullable<PTNode> = null;
  constructor(sym: Sym) {
    this.sym = sym;
  }

  get isTerminal(): boolean {
    return this.sym.isTerminal;
  }
}

export class PTNTerm extends PTNode {
  token: Nullable<Token>;
  constructor(sym: Sym, token: Nullable<Token> = null) {
    super(sym);
    this.token = token;
  }
}

export class PTNNonTerm extends PTNode {
  readonly children: PTNode[];
  readonly ruleIndex = 0;
  constructor(nt: Sym, ruleIndex = 0, ...children: PTNode[]) {
    super(nt);
    this.children = children;
  }

  add(node: PTNode): PTNNonTerm {
    node.parent = this;
    this.children.push(node);
    return this;
  }
}

export abstract class Parser {
  grammar: Grammar;
  constructor(grammar: Grammar) {
    this.grammar = grammar;
  }

  /**
   * Converts the token to a Terminal based on the tag value.
   */
  getSym(token: Token): Sym {
    const out = this.grammar.getSym(token.tag as string);
    if (out == null) {
      throw new Error("Invalid token: " + token.value);
    }
    return out;
  }

  /**
   * Parses the input and returns the resulting root Parse Tree node.
   */
  abstract parse(tokenizer: Tokenizer): Nullable<PTNode>;
}

export class ParseTableItem {
  readonly nt: Sym;
  readonly ruleIndex: number;
  readonly position: number;
  constructor(nt: Sym, ruleIndex = 0, position = 0) {
    this.nt = nt;
    this.ruleIndex = ruleIndex;
    this.position = position;
  }
}

export class ParseTable {
  readonly grammar: Grammar;
  protected entries: Map<number, Map<number, ParseTableItem[]>>;
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

  ensureEntry(nt: Sym, term: Sym): ParseTableItem[] {
    assert(!nt.isTerminal && term.isTerminal);
    let entriesForNT = this.entries.get(nt.id) as Map<number, ParseTableItem[]>;
    if (!entriesForNT) {
      entriesForNT = new Map();
      this.entries.set(nt.id, entriesForNT);
    }
    let entries = entriesForNT.get(term.id) as ParseTableItem[];
    if (!entries) {
      entries = [];
      entriesForNT.set(term.id, entries);
    }
    return entries;
  }

  add(nt: Sym, term: Sym, entry: ParseTableItem): boolean {
    const entries = this.ensureEntry(nt, term);
    entries.push(entry);
    return entries.length == 1;
  }

  get(nt: Sym, term: Sym): ParseTableItem[] {
    return this.ensureEntry(nt, term);
  }

  forEachEntry(visitor: (nonterm: Sym, term: Sym, items: ParseTableItem[]) => boolean | void): void {
    for (const ntId of this.entries.keys()) {
      const ntMap = this.entries.get(ntId) || null;
      assert(ntMap != null);
      const nonterm = this.grammar.getSymById(ntId);
      assert(nonterm != null);
      for (const termId of ntMap.keys()) {
        const term = this.grammar.getSymById(termId);
        assert(term != null);
        const items = ntMap.get(termId) || [];
        if (visitor(nonterm, term, items) == false) return;
      }
    }
  }

  get debugValue(): any {
    const out = {} as any;
    this.forEachEntry((nt, term, items) => {
      const key = "<" + nt.label + "," + term.label + ">";
      const entries = out[key] || [];
      for (const item of items) {
        entries.push(`${item.nt.label} -> ${item.nt.rules[item.ruleIndex].debugString}`);
      }
    });
    return out;
  }
}
