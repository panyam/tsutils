import { Sym, Str, Grammar } from "./grammar";
import { FirstSets } from "./sets";
import { assert } from "../utils/misc";
import { StringMap, NumMap, Nullable } from "../types";

interface LRItem {
  id: number;
  readonly nt: Sym;
  readonly ruleIndex: number;
  readonly position: number;
  readonly key: string;
  readonly debugString: string;
  compareTo(another: this): number;
  equals(another: this): boolean;
  copy(): LRItem;

  /**
   * Get the LRItem corresponding to the given item by advancing
   * its cursor position.
   */
  advance(): LRItem;
}

export class LR0Item implements LRItem {
  id = 0;
  readonly nt: Sym;
  readonly ruleIndex: number;
  readonly position: number;
  constructor(nt: Sym, ruleIndex = 0, position = 0) {
    this.nt = nt;
    this.ruleIndex = ruleIndex;
    this.position = position;
  }

  advance(): LRItem {
    const rule = this.nt.rules[this.ruleIndex];
    assert(this.position < rule.length);
    return new LR0Item(this.nt, this.ruleIndex, this.position + 1);
  }

  copy(): LRItem {
    return new LR0Item(this.nt, this.ruleIndex, this.position);
  }

  get key(): string {
    return this.nt.id + ":" + this.ruleIndex + ":" + this.position;
  }

  compareTo(another: this): number {
    let diff = this.nt.id - another.nt.id;
    if (diff == 0) diff = this.ruleIndex - another.ruleIndex;
    if (diff == 0) diff = this.position - another.position;
    return diff;
  }

  equals(another: this): boolean {
    return this.compareTo(another) == 0;
  }

  get debugString(): string {
    const rule = this.nt.rules[this.ruleIndex];
    const pos = this.position;
    const pre = rule.syms.slice(0, pos).join(" ");
    const post = rule.syms.slice(pos).join(" ");
    return `(${this.ruleIndex}, ${this.position}) - (${this.nt.id}) ${this.nt} -> ${pre} . ${post}`;
  }
}

export class LRItemSet {
  id = 0;
  readonly itemGraph: LRItemGraph;
  protected _key: Nullable<string> = null;
  readonly values: number[];

  constructor(ig: LRItemGraph, ...entries: number[]) {
    this.itemGraph = ig;
    this.values = entries;
  }

  // A way to cache the key of this item set.
  // Keys help make the comparison of two sets easy.
  get key(): string {
    if (this._key == null) {
      return this.sortedValues.join("/");
    }
    return this._key;
  }

  has(itemId: number): boolean {
    return this.values.indexOf(itemId) >= 0;
  }

  equals(another: LRItemSet): boolean {
    return this.key == another.key;
  }

  add(itemId: number): this {
    if (!this.has(itemId)) {
      this.values.push(itemId);
      this._key = null;
    }
    return this;
  }

  get size(): number {
    return this.values.length;
  }

  get sortedValues(): number[] {
    this.values.sort();
    return this.values;
    /*
    const values = [] as number[];
    for (const v of this.values()) values.push(v);
    values.sort();
    return values;
   */
  }

  get debugString(): string {
    return this.sortedValues.map((v: number) => this.itemGraph.items[v].debugString).join("\n");
  }
}

export abstract class LRItemGraph {
  readonly grammar: Grammar;

  // List of all unique LRItems that can be used in this item graph.
  // Note that since the same Item can reside in multiple sets only
  // one is created via the newItem method and it is referred
  // everwhere it is needed.
  items: LRItem[] = [];
  // Table pointing Item.key -> indexes in the above table.
  protected itemIndexes: StringMap<number> = {};

  // All Item sets in this graph
  itemSets: LRItemSet[] = [];
  protected itemSetIndexes: StringMap<number> = {};

  // Goto sets for a set and a given transition out of it
  gotoSets: NumMap<NumMap<LRItemSet>> = {};

  constructor(grammar: Grammar) {
    this.grammar = grammar;
  }

  abstract closure(itemSet: LRItemSet): LRItemSet;
  protected abstract startItem(): LRItem;

  refresh(): this {
    this.gotoSets = {};
    this.itemSets = [];
    this.itemSetIndexes = {};
    this.items = [];
    this.itemIndexes = {};
    this.startSet();
    const out = this.itemSets;

    for (let i = 0; i < out.length; i++) {
      const currSet = out[i];
      for (const sym of this.grammar.allSymbols) {
        let gotoSet = this.goto(currSet, sym);
        if (gotoSet.size > 0) {
          this.setGoto(currSet, sym, gotoSet);
        }
      }
    }
    return this;
  }

  /**
   * Computes the GOTO set of this ItemSet for a particular symbol transitioning
   * out of this item set.
   */
  goto(itemSet: LRItemSet, sym: Sym): LRItemSet {
    const out = new LRItemSet(this);
    for (const itemId of itemSet.values) {
      const item = this.items[itemId];
      // see if item.position points to "sym" in its rule
      const rule = item.nt.rules[item.ruleIndex];
      if (item.position < rule.length) {
        if (rule.syms[item.position] == sym) {
          // advance the item and add it
          out.add(this.getItem(item.advance()).id);
        }
      }
    }
    // compute the closure of the new set
    return this.closure(out);
  }

  getItem(item: LRItem): LRItem {
    if (!(item.key in this.itemIndexes)) {
      item = item.copy();
      item.id = this.itemIndexes[item.key] = this.items.length;
      this.items.push(item);
      return item;
    } else {
      return this.items[this.itemIndexes[item.key]];
    }
  }

  hasItemSet(itemSet: LRItemSet): boolean {
    return itemSet.key in this.itemSetIndexes;
  }

  getItemSet(itemSet: LRItemSet): LRItemSet {
    assert(itemSet.values.length > 0);
    // see if this itemset exists
    if (this.hasItemSet(itemSet)) {
      return this.itemSets[this.itemSetIndexes[itemSet.key]];
    } else {
      itemSet.id = this.itemSetIndexes[itemSet.key] = this.itemSets.length;
      this.itemSets.push(itemSet);
    }
    return itemSet;
  }

  protected newItemSet(...items: LRItem[]): LRItemSet {
    return new LRItemSet(this, ...items.map((item) => item.id));
  }

  get size(): number {
    return this.itemSets.length;
  }

  /**
   * Creates the set for the grammar.  This is done by creating an
   * augmented rule of the form S' -> S (where S is the start symbol of
   * the grammar) and creating the closure of this starting rule, ie:
   *
   * StartSet = closure({S' -> . S})
   */
  startSet(): LRItemSet {
    const startSymbol = this.grammar.startSymbol;
    assert(startSymbol != null, "Start symbol must be set");
    const startItem = this.startItem();
    const newset = this.newItemSet(startItem);
    return this.closure(newset);
  }

  protected ensureGotoSet(fromSet: LRItemSet): NumMap<LRItemSet> {
    if (!(fromSet.id in this.gotoSets)) {
      this.gotoSets[fromSet.id] = {};
    }
    return this.gotoSets[fromSet.id];
  }

  setGoto(fromSet: LRItemSet, sym: Sym, toSet: LRItemSet): void {
    const entries = this.ensureGotoSet(fromSet);
    entries[sym.id] = toSet;
  }

  getGoto(fromSet: LRItemSet, sym: Sym): Nullable<LRItemSet> {
    return (this.gotoSets[fromSet.id] || {})[sym.id] || null;
  }

  forEachGoto(itemSet: LRItemSet, visitor: (sym: Sym, nextSet: LRItemSet) => boolean | void): void {
    const gotoSet = this.gotoSets[itemSet.id] || {};
    for (const symid in gotoSet) {
      const sym = this.grammar.getSymById(symid as any) as Sym;
      const next = gotoSet[symid];
      if (visitor(sym, next) == false) break;
    }
  }

  gotoSetFor(itemSet: LRItemSet): NumMap<LRItemSet> {
    return this.gotoSets[itemSet.id] || {};
  }
}

export class LR1Item extends LR0Item {
  readonly lookahead: Sym;
  constructor(lookahead: Sym, nt: Sym, ruleIndex = 0, position = 0) {
    super(nt, ruleIndex, position);
    this.lookahead = lookahead;
  }

  copy(): LR1Item {
    return new LR1Item(this.lookahead, this.nt, this.ruleIndex, this.position);
  }

  advance(): LRItem {
    const rule = this.nt.rules[this.ruleIndex];
    assert(this.position < rule.length);
    return new LR1Item(this.lookahead, this.nt, this.ruleIndex, this.position + 1);
  }

  get key(): string {
    return this.nt.id + ":" + this.ruleIndex + ":" + this.position + ":" + this.lookahead.id;
  }

  compareTo(another: this): number {
    let diff = super.compareTo(another);
    if (diff == 0) diff = this.lookahead.id - another.lookahead.id;
    return diff;
  }

  equals(another: this): boolean {
    return this.compareTo(another) == 0;
  }

  get debugString(): string {
    const rule = this.nt.rules[this.ruleIndex];
    const pos = this.position;
    const pre = rule.syms.slice(0, pos).join(" ");
    const post = rule.syms.slice(pos).join(" ");
    return (
      `(${this.ruleIndex}, ${this.position}) - (${this.nt.id}) ${this.nt} -> ${pre} . ${post}` +
      "   /   " +
      this.lookahead.label
    );
  }
}

export class LR0ItemGraph extends LRItemGraph {
  protected startItem(): LRItem {
    return this.getItem(new LR0Item(this.grammar.augStart));
  }

  /**
   * Computes the closure of a given item set and returns a new
   * item set.
   */
  closure(itemSet: LRItemSet): LRItemSet {
    const out = new LRItemSet(this, ...itemSet.values);
    for (let i = 0; i < out.values.length; i++) {
      const itemId = out.values[i];
      const item = this.items[itemId];
      const rule = item.nt.rules[item.ruleIndex];
      // Evaluate the closure
      // Cannot do anything past the end
      if (item.position < rule.length) {
        const sym = rule.syms[item.position];
        if (!sym.isTerminal) {
          for (let i = 0; i < sym.rules.length; i++) {
            const newItem = this.getItem(new LR0Item(sym, i, 0));
            out.add(newItem.id);
          }
        }
      }
    }
    return out.size == 0 ? out : this.getItemSet(out);
  }
}

export class LR1ItemGraph extends LRItemGraph {
  firstSets: FirstSets;

  constructor(grammar: Grammar, firstSets: FirstSets) {
    super(grammar);
    this.firstSets = firstSets;
  }

  refresh(): this {
    this.firstSets.refresh();
    return super.refresh();
  }

  /**
   * Overridden to create LR1ItemSet objects with the start state
   * also including the EOF marker as the lookahead.
   *
   * StartSet = closure({S' -> . S, $})
   */
  startItem(): LRItem {
    return this.getItem(new LR1Item(this.grammar.Eof, this.grammar.augStart, 0, 0));
  }

  /**
   * Computes the closure of this item set and returns a new
   * item set.
   */
  closure(itemSet: LRItemSet): LRItemSet {
    const out = new LRItemSet(this, ...itemSet.values);
    for (let i = 0; i < out.values.length; i++) {
      const itemId = out.values[i];
      const item = this.items[itemId] as LR1Item;
      const rule = item.nt.rules[item.ruleIndex];
      // Evaluate the closure
      // Cannot do anything past the end
      if (item.position >= rule.length) continue;
      const B = rule.syms[item.position];
      if (B.isTerminal) continue;

      const suffix = rule.copy().append(item.lookahead);
      this.firstSets.forEachTermIn(suffix, item.position + 1, (term) => {
        if (term != null) {
          // For each rule [ B -> beta, term ] add it to
          // our list of items if it doesnt already exist
          for (let j = 0; j < B.rules.length; j++) {
            const newItem = this.getItem(new LR1Item(term, B, j, 0));
            out.add(newItem.id);
          }
        }
      });
    }
    return out.size == 0 ? out : this.getItemSet(out);
  }
}
