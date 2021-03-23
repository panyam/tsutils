import { assert } from "../utils/misc";
import { NumMap, Nullable } from "../types";
import { Sym, Grammar } from "./grammar";
import { LRItemSet, LR0Item, LR0ItemGraph } from "./lr0";
import { LRAction } from "./lr";
import { FollowSets } from "./sets";

/**
 * A base LR parse table with actions for each parse state.
 */
export class ParseTable {
  readonly grammar: Grammar;
  readonly itemGraph: LR0ItemGraph;
  readonly followSets: FollowSets;

  /**
   * Maps symbol (by id) to the action;
   */
  actions: NumMap<NumMap<LRAction[]>> = {};

  constructor(grammar: Grammar) {
    this.grammar = grammar;
    this.itemGraph = new LR0ItemGraph(grammar);
    this.followSets = new FollowSets(grammar);
    this.refresh();
  }

  get debugActions(): any {
    const out: any = {};
    for (const fromId in this.actions) {
      out[fromId] = {};
      for (const symId in this.actions[fromId]) {
        const sym = this.grammar.getSymById(symId as any)!;
        const actions = this.actions[fromId][sym.id] || [];
        if (actions.length > 0) {
          out[fromId][sym.label] = actions.map((a) => a.toString()).join(", ");
        }
      }
    }
    return out;
  }

  /**
   * Gets the action for a given sym from a given state.
   */
  getActions(state: LRItemSet, next: Sym, ensure = false): LRAction[] {
    let l1: NumMap<LRAction[]>;
    if (state.id in this.actions) {
      l1 = this.actions[state.id];
    } else if (ensure) {
      l1 = this.actions[state.id] = {};
    } else {
      return [];
    }

    if (next.id in l1) {
      return l1[next.id];
    } else if (ensure) {
      return (l1[next.id] = []);
    }
    return [];
  }

  addAction(state: LRItemSet, next: Sym, action: LRAction): void {
    const actions = this.getActions(state, next, true);
    actions.push(action);
  }

  /**
   * Evaluate all Parse States for this grammar and compute the parse table.
   */
  refresh(): void {
    // Refresh the item graph - the collection of sets of LR(0) items
    this.followSets.refresh();
    this.itemGraph.refresh();

    const ig = this.itemGraph;
    for (const itemSet of ig.itemSets) {
      // Look for transitions from this set
      for (const itemId of itemSet.values) {
        const item = ig.items[itemId];
        const nt = item.nt;
        const rule = nt.rules[item.ruleIndex];
        if (item.position < rule.length) {
          // possibilities of shift
          const sym = rule.syms[item.position];
          if (sym.isTerminal) {
            const nextSet = ig.getGoto(itemSet, sym);
            if (nextSet) {
              this.addAction(itemSet, sym, LRAction.Shift(nextSet));
            }
          }
        } else {
          // if sym is in follows(nt) then add the rule
          // Reduce nt -> rule for all sym in follows(nt)
          this.followSets.forEachTerm(nt, (term) => {
            if (term != null) {
              assert(term.isTerminal);
              this.addAction(itemSet, term, LRAction.Reduce(nt, item.ruleIndex));
            }
          });
        }
      }

      // Now create GOTO entries for (State,X) where X is a non-term
      ig.forEachGoto(itemSet, (sym, next) => {
        if (sym != null && !sym.isTerminal) {
          this.addAction(itemSet, sym, LRAction.Goto(next));
        }
      });

      // If this state contains the augmented item, S' -> S .
      // then add accept
      if (itemSet.has(ig.getItem(new LR0Item(this.grammar.augStart, 0, 1)).id)) {
        this.addAction(itemSet, this.grammar.Eof, LRAction.Accept());
      }
    }
  }
}
