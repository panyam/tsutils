import { Sym, Grammar } from "./grammar";
import { FirstSets } from "./sets";
import { assert } from "../utils/misc";
import { LRItem, LRItemSet, LRItemGraph } from "./lrbase";
import { LR0Item } from "./lr0";

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

export class LR1ItemGraph extends LRItemGraph {
  firstSets: FirstSets;

  constructor(grammar: Grammar, firstSets: FirstSets) {
    super(grammar);
    this.firstSets = firstSets;
  }

  reset(): void {
    this.firstSets.refresh();
    super.reset();
  }

  /**
   * Overridden to create LR1ItemSet objects with the start state
   * also including the EOF marker as the lookahead.
   *
   * StartSet = closure({S' -> . S, $})
   */
  startItem(): LRItem {
    return this.items.ensure(new LR1Item(this.grammar.Eof, this.grammar.augStart, 0, 0));
  }

  /**
   * Computes the closure of this item set and returns a new
   * item set.
   */
  closure(itemSet: LRItemSet): LRItemSet {
    const out = new LRItemSet(this, ...itemSet.values);
    for (let i = 0; i < out.values.length; i++) {
      const itemId = out.values[i];
      const item = this.items.get(itemId) as LR1Item;
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
            const newItem = this.items.ensure(new LR1Item(term, B, j, 0));
            out.add(newItem.id);
          }
        }
      });
    }
    return out.size == 0 ? out : this.itemSets.ensure(out);
  }
}
