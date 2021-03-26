import { Sym, Str, Grammar } from "./grammar";
import { Token } from "./tokenizer";
import { PTNode, Parser as ParserBase } from "./parser";
import { StringMap, Nullable } from "../types";
import { assert } from "../utils/misc";
import { FollowSets } from "./sets";
import { terminalWidth } from "yargs";

export class ParseTableItem {
  readonly nt: Sym;
  readonly ruleIndex: number;
  constructor(nt: Sym, ruleIndex = 0) {
    this.nt = nt;
    this.ruleIndex = ruleIndex;
  }

  get debugString(): string {
    return `${this.nt.label} -> ${this.nt.rules[this.ruleIndex].debugString}`
  }
}

export class ParseTable {
  readonly grammar: Grammar;
  protected entries: Map<number, Map<number, ParseTableItem[]>>;
  followSets: FollowSets;

  constructor(grammar: Grammar, followSets?: FollowSets) {
    this.grammar = grammar;
    this.entries = new Map();
    this.followSets = followSets || new FollowSets(grammar);
  }

  refresh(): this {
    this.entries = new Map();
    this.followSets.refresh();
    this.grammar.forEachRule((nt, rule, index) => {
      this.processRule(nt, rule, index);
    });
    return this;
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

  get debugValue(): StringMap<StringMap<string[]>> {
    const out: StringMap<StringMap<string[]>> = {};
    this.forEachEntry((nt, term, items) => {
      out[nt.label] = out[nt.label] || {};
      out[nt.label][term.label] = out[nt.label][term.label] || [];
      const entries = out[nt.label][term.label];
      for (const item of items) {
        entries.push(item.debugString);
      }
    });
    return out;
  }

  processRule(nt: Sym, rule: Str, index: number): void {
    const firstSets = this.followSets.firstSets;
    // Rule 1
    // For each a in First(rule) add A -> rule to M[A,a]
    let ruleIsNullable = false;
    firstSets.forEachTermIn(rule, 0, (term) => {
      if (term == null) {
        ruleIsNullable = true;
      } else {
        this.add(nt, term, new ParseTableItem(nt, index));
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
        this.add(nt, term, new ParseTableItem(nt, index));
      });
    }
  }
}

export class ParseStack {
  readonly grammar: Grammar;
  readonly parseTable: ParseTable;
  readonly stack: [Sym, PTNode][];
  readonly docNode: PTNode;
  readonly rootNode: PTNode;
  constructor(g: Grammar, parseTable: ParseTable) {
    this.grammar = g;
    this.parseTable = parseTable;
    this.stack = [];
    assert(g.startSymbol != null, "Start symbol not selected");
    this.docNode = this.push(g.Eof, new PTNode(new Sym(g, "<DOC>", false)));
    this.rootNode = this.push(g.startSymbol);
    this.docNode.add(this.rootNode);
  }

  get debugString(): string {
    return "Stack: [" + this.stack.map((x) => x[0].label).join(", ") + "]";
  }

  push(sym: Sym, node: Nullable<PTNode> = null): PTNode {
    if (!node) node = new PTNode(sym);
    this.stack.push([sym, node]);
    return node;
  }

  top(): [Sym, PTNode] {
    return this.stack[this.stack.length - 1];
  }

  pop(): [Sym, PTNode] {
    if (this.stack.length == 0) {
      assert(false, "Stacks are empty");
    }
    return this.stack.pop()!;
  }

  get isEmpty(): boolean {
    return this.stack.length == 0;
  }
}

export class Parser extends ParserBase {
  parseTable: ParseTable;
  stack: ParseStack;
  constructor(grammar: Grammar, parseTable?: ParseTable) {
    super(grammar);
    this.parseTable = parseTable || new ParseTable(grammar);
    this.stack = new ParseStack(this.grammar, this.parseTable);
  }

  /**
   * Parses the input and returns the resulting root Parse Tree node.
   */
  parse(): Nullable<PTNode> {
    const tokenizer = this.tokenizer;
    const stack = this.stack;
    const g = this.grammar;
    let token: Nullable<Token>;
    let topItem: Sym;
    let topNode: PTNode;
    do {
      token = tokenizer.peek();
      [topItem, topNode] = stack.top();
      const nextSym = token == null ? g.Eof : this.getSym(token);
      const nextValue = token == null ? null : token.value;
      if (topItem.isTerminal) {
        if (topItem == nextSym) {
          // Something must happen here to stack symbol to build
          // the parse tree
          this.consumeTokenAndPop(nextSym, nextValue);
        } else {
          this.processInvalidToken(nextSym, nextValue);
        }
      } else {
        const entries = this.parseTable.get(topItem, nextSym);
        if (entries.length != 1) {
          this.processInvalidReductions(nextSym, nextValue, entries);
        } else {
          this.popSymAndPushRule(entries[0]);
        }
      }
      [topItem, topNode] = stack.top(); // Update top pointer
    } while (topItem != g.Eof); // !stack.isEmpty);
    return stack.rootNode;
  }

  popSymAndPushRule(entry: ParseTableItem): void {
    const [sym, ptnode] = this.stack.pop();
    // This needs to match so we can push its children
    assert(sym == entry.nt);
    assert(ptnode.sym == entry.nt);
    const rule = entry.nt.rules[entry.ruleIndex];
    for (let i = rule.syms.length - 1; i >= 0; i--) {
      const sym = rule.syms[i];
      const node = this.stack.push(sym);
      ptnode.children.splice(0, 0, node);
    }
  }
  consumeTokenAndPop(nextSym: Sym, nextToken: Token): void {
    const [sym, ptnode] = this.stack.top();
    assert(sym == nextSym);
    assert(ptnode.sym == nextSym);
    ptnode.value = nextToken;
    this.tokenizer.next();
    this.stack.pop();
  }

  processInvalidToken(nextSym: Sym, nextValue: any): boolean {
    throw new Error("Invalid token: " + nextSym.label);
    return true;
  }

  processInvalidReductions(nextSym: Sym, nextValue: any, entries: ParseTableItem[]): boolean {
    throw new Error("Invalid # reductions found: " + entries.length);
    return true;
  }
}
