import { Sym } from "./grammar";
import { assert } from "../utils/misc";
import { LRItem, LRItemSet, LRItemGraph } from "./lrbase";

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

  /**
   * TODO - Instead of using strings as keys, can we use a unique ID?
   * If we assume a max limit on number of non terminals in our grammar
   * and a max limit on the number of rules per non terminal and a
   * max limit on the size of each rule then we can uniquely identify
   * a rule and position for a non-terminal by a single (64 bit) number
   *
   * We can use the following bitpacking to nominate this:
   *
   * <padding 16 bits><nt id 16 bits><ruleIndex 16 bits><position 16 bits>
   */
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

export class LR0ItemGraph extends LRItemGraph {
  protected startItem(): LRItem {
    return this.items.ensure(new LR0Item(this.grammar.augStart));
  }

  /**
   * Computes the closure of a given item set and returns a new
   * item set.
   */
  closure(itemSet: LRItemSet): LRItemSet {
    const out = new LRItemSet(this, ...itemSet.values);
    for (let i = 0; i < out.values.length; i++) {
      const itemId = out.values[i];
      const item = this.items.get(itemId);
      const rule = item.nt.rules[item.ruleIndex];
      // Evaluate the closure
      // Cannot do anything past the end
      if (item.position < rule.length) {
        const sym = rule.syms[item.position];
        if (!sym.isTerminal) {
          for (let i = 0; i < sym.rules.length; i++) {
            const newItem = this.items.ensure(new LR0Item(sym, i, 0));
            out.add(newItem.id);
          }
        }
      }
    }
    return out.size == 0 ? out : this.itemSets.ensure(out);
  }
}
