import { Sym, Str, Grammar } from "./grammar";
import { assert } from "../utils/misc";
import { StringMap, NumMap, Nullable } from "../types";

export class LRItem {
  readonly nt: Sym;
  readonly ruleIndex: number;
  readonly position: number;
  constructor(nt: Sym, ruleIndex = 0, position = 0) {
    this.nt = nt;
    this.ruleIndex = ruleIndex;
    this.position = position;
  }

  get key(): string {
    return this.nt.id + ":" + this.ruleIndex + ":" + this.position;
  }

  compareTo(another: LRItem): number {
    let diff = this.nt.id - another.nt.id;
    if (diff == 0) diff = this.ruleIndex - another.ruleIndex;
    if (diff == 0) diff = this.position - another.position;
    return diff;
  }

  equals(another: LRItem): boolean {
    return this.compareTo(another) == 0;
  }

  advance(): LRItem {
    const rule = this.nt.rules[this.ruleIndex];
    assert(this.position < rule.length);
    return new LRItem(this.nt, this.ruleIndex, this.position + 1);
  }
}

export class LRItemSet {
  id = 0;

  // List of all unique LRItems in this set
  protected items: LRItem[] = [];

  // Table pointing Item.key -> indexes in the above table.
  protected itemIndexes: StringMap<number> = {};

  printed(): string {
    return this.items
      .map((item) => {
        const rule = item.nt.rules[item.ruleIndex];
        const pos = item.position;
        const pre = rule.syms.slice(0, pos).join(" ");
        const post = rule.syms.slice(pos).join(" ");
        return `(${item.ruleIndex}, ${item.position}) - ${item.nt} (${item.nt.id}) -> ${pre} . ${post}`;
      })
      .join("\n");
  }

  // A way to cache the key of this item set.
  // Keys help make the comparison of two sets easy.
  protected _key: Nullable<string> = null;
  get key(): string {
    if (this._key == null) {
      this._key = [...this.items]
        .sort((item1, item2) => item1.compareTo(item2))
        .map((item) => item.key)
        .join("/");
    }
    return this._key;
  }

  add(item: LRItem): number {
    if (!this.contains(item)) {
      this.itemIndexes[item.key] = this.items.length;
      this.items.push(item);
      this._key = null;
    }
    return this.itemIndexes[item.key];
  }

  get size(): number {
    return this.items.length;
  }

  containsRule(sym: Sym, ruleIndex: number, position: number): boolean {
    return this.contains(new LRItem(sym, ruleIndex, position));
  }

  contains(item: LRItem): boolean {
    return item.key in this.itemIndexes;
  }

  /**
   * Tells if this set equals another set.
   */
  equals(another: LRItemSet): boolean {
    return this.size == another.size && this.key == another.key;
  }

  /**
   * Computes the closure of this item set and returns a new
   * item set.
   */
  closure(): void {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const rule = item.nt.rules[item.ruleIndex];
      // Evaluate the closure
      // Cannot do anything past the end
      if (item.position < rule.length) {
        const sym = rule.syms[item.position];
        if (!sym.isTerminal) {
          for (let i = 0; i < sym.rules.length; i++) {
            const newItem = new LRItem(sym, i, 0);
            this.add(newItem);
          }
        }
      }
    }
  }

  /**
   * Computes the GOTO set of this ItemSet for a particular symbol transitioning
   * out of this item set.
   */
  goto(sym: Sym): LRItemSet {
    const out = new LRItemSet();
    for (const item of this.items) {
      // see if item.position points to "sym" in its rule
      const rule = item.nt.rules[item.ruleIndex];
      if (item.position < rule.length) {
        if (rule.syms[item.position] == sym) {
          // advance the item and add it
          out.add(item.advance());
        }
      }
    }
    // compute the closure of the new set
    out.closure();
    return out;
  }
}

export class LRItemGraph {
  readonly grammar: Grammar;
  itemSets: LRItemSet[];
  gotoSets: NumMap<NumMap<LRItemSet>>;
  protected setIndexes: StringMap<number>;

  constructor(grammar: Grammar) {
    this.grammar = grammar;
    this.refresh();
  }

  get size(): number {
    return this.itemSets.length;
  }

  contains(itemset: LRItemSet): boolean {
    return itemset.key in this.setIndexes;
  }

  refresh(): void {
    this.setIndexes = {};
    const startSet = this.createStartSet();
    const out = (this.itemSets = [startSet]);
    this.gotoSets = {};

    for (let i = 0; i < out.length; i++) {
      const currSet = out[i];
      for (const sym of this.grammar.allSymbols) {
        const gotoSet = currSet.goto(sym);
        if (gotoSet.size > 0) {
          if (!(gotoSet.key in this.setIndexes)) {
            gotoSet.id = this.setIndexes[gotoSet.key] = out.length;
            out.push(gotoSet);
          }
          this.setGoto(currSet, sym, gotoSet);
        }
      }
    }
  }

  /**
   * Creates the set for the grammar.  This is done by creating an augmented
   * rule of the form S' -> S (where S is the start symbol of the grammar) and
   * creating the closure of this starting rule, ie:
   *
   * StartSet = closure({S' -> . S})
   */
  createStartSet(): LRItemSet {
    const startSymbol = this.grammar.startSymbol;
    assert(startSymbol != null, "Start symbol must be set");
    const startSet = new LRItemSet();
    for (let i = 0; i < startSymbol.rules.length; i++) {
      startSet.add(new LRItem(startSymbol, i, 0));
    }
    startSet.closure();
    return startSet;
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
}