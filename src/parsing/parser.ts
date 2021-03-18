import { Nullable } from "../types";
import { Token } from "./tokenizer";
import { NonTerm, Term, Str, Grammar } from "./grammar";
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

export class PTNode {
  readonly tag: NodeType;
  parent: Nullable<PTNode> = null;
  token: Nullable<Token> = null;
  readonly _children: PTNode[];
  constructor(tag: NodeType, token: Nullable<Token>) {
    this._children = [];
    this.tag = tag;
    this.token = token;
  }

  get isToken(): boolean {
    return this.token != null;
  }

  get children(): ReadonlyArray<PTNode> {
    return this._children;
  }

  add(node: PTNode): void {
    if (this.isToken) {
      throw new Error("Cannot add _children to a token node");
    }
    node.parent = this;
    this._children.push(node);
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
  getLit(token: Token): Term {
    const out = this.grammar.getTerm(token.tag as string);
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
  readonly nt: NonTerm;
  readonly ruleIndex: number;
  readonly position: number;
  constructor(nt: NonTerm, ruleIndex = 0, position = 0) {
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

  ensureEntry(nt: NonTerm, term: Term): ParseTableItem[] {
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

  add(nt: NonTerm, term: Term, entry: ParseTableItem): boolean {
    const entries = this.ensureEntry(nt, term);
    entries.push(entry);
    return entries.length == 1;
  }

  get(nt: NonTerm, term: Term): ParseTableItem[] {
    return this.ensureEntry(nt, term);
  }

  forEachEntry(visitor: (nonterm: NonTerm, term: Term, items: ParseTableItem[]) => boolean | void): void {
    for (const ntId of this.entries.keys()) {
      const ntMap = this.entries.get(ntId) || null;
      assert(ntMap != null);
      const nonterm = this.grammar.getLitById(ntId) as NonTerm;
      assert(nonterm != null);
      for (const termId of ntMap.keys()) {
        const term = this.grammar.getLitById(termId) as Term;
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
