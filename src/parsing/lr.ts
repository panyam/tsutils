import { Sym, Grammar } from "./grammar";
import { Token } from "./tokenizer";
import { Tokenizer, PTNode, Parser as ParserBase } from "./parser";
import { NumMap, Nullable } from "../types";
import { UnexpectedTokenError } from "./errors";
import { assert } from "../utils/misc";
import { LRItemSet, LRItemGraph } from "./lritems";
import { FollowSets } from "./sets";

export enum LRActionType {
  ACCEPT,
  SHIFT,
  REDUCE,
  GOTO, // can *ONLY* be valid for non-terms
}

export class LRAction {
  // Type of action
  tag: LRActionType;

  // Next state to go to after performing the action (if valid).
  nextState: Nullable<LRItemSet> = null;

  // The symbol that would trigger this action.
  nonterm: Nullable<Sym> = null;

  // Index of the rule to be used if action is REDUCE
  // here sym MUST be a non terminal as ruleIndex would
  // index into its list of rules.
  ruleIndex = -1;

  toString(): string {
    if (this.tag == LRActionType.ACCEPT) return "Acc";
    else if (this.tag == LRActionType.SHIFT) {
      return "S" + this.nextState!.id;
    } else if (this.tag == LRActionType.REDUCE) {
      return "R <" + this.nonterm!.label + " -> " + this.nonterm!.rules[this.ruleIndex] + ">";
    } else {
      return "" + this.nextState!.id;
    }
  }

  equals(another: LRAction): boolean {
    return (
      this.tag == another.tag &&
      this.nextState == another.nextState &&
      this.nonterm == another.nonterm &&
      this.ruleIndex == another.ruleIndex
    );
  }

  static Shift(next: LRItemSet): LRAction {
    const out = new LRAction();
    out.tag = LRActionType.SHIFT;
    out.nextState = next;
    return out;
  }

  static Reduce(sym: Sym, ruleIndex: number): LRAction {
    assert(!sym.isTerminal, "Reduce only applies non terminals");
    const out = new LRAction();
    out.tag = LRActionType.REDUCE;
    out.ruleIndex = ruleIndex;
    out.nonterm = sym;
    return out;
  }

  static Goto(nextState: LRItemSet): LRAction {
    const out = new LRAction();
    out.tag = LRActionType.GOTO;
    out.nextState = nextState;
    return out;
  }

  static Accept(): LRAction {
    const out = new LRAction();
    out.tag = LRActionType.ACCEPT;
    return out;
  }
}

/**
 * A base LR parse table with actions for each parse state.
 */
export class ParseTable {
  readonly grammar: Grammar;
  readonly itemGraph: LRItemGraph;
  readonly followSets: FollowSets;

  /**
   * Maps symbol (by id) to the action;
   */
  actions: NumMap<NumMap<LRAction[]>> = {};

  constructor(grammar: Grammar) {
    this.grammar = grammar;
    this.itemGraph = new LRItemGraph(grammar);
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
      for (const item of itemSet.items) {
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
      if (itemSet.containsRule(this.grammar.augStart, 0, 1)) {
        this.addAction(itemSet, this.grammar.Eof, LRAction.Accept());
      }
    }
  }
}

/*
export class LRParseStack {
  readonly grammar: Grammar;
  readonly parseTable: ParseTable;
  // A way of marking the kind of item that is on the stack
  // true => isStateId
  // false => isSymbolId
  readonly stateStack: PTState[] = [];
  readonly symStack: Sym[] = [];
  readonly nodeStack: PTNode[] = []; // TBD
  constructor(g: Grammar, parseTable: ParseTable) {
    this.grammar = g;
    this.parseTable = parseTable;
    assert(g.startSymbol != null, "Start symbol not selected");
  }

  push(state: PTState, sym: Sym): void {
    this.stateStack.push(state);
    this.symStack.push(sym);
  }

  top(): [PTState, Sym] {
    return [this.stateStack[this.stateStack.length - 1], this.symStack[this.symStack.length - 1]];
  }

  pop(): [PTState, Sym] {
    if (this.isEmpty) {
      assert(false, "Stack is empty.");
    }
    const state = this.stateStack.pop() as PTState;
    const sym = this.symStack.pop() as Sym;
    return [state, sym];
  }

  get isEmpty(): boolean {
    return this.stateStack.length == 0 || this.symStack.length == 0;
  }
}
*/

export class LRParser extends ParserBase {
  parseTable: ParseTable;
  constructor(grammar: Grammar, parseTable: ParseTable) {
    super(grammar);
    this.parseTable = parseTable;
  }

  /**
   * Parses the input and returns the resulting root Parse Tree node.
   */
  parse(tokenizer: Tokenizer): Nullable<PTNode> {
    /*
    const g = this.grammar;
    const stack = new LRParseStack(this.grammar, this.parseTable);
    let token: Nullable<Token>;
    let topState: PTState;
    let topSym: Sym;
    do {
      token = tokenizer.peek();
      const nextSym = token == null ? g.Eof : this.getSym(token);
      const nextValue = token == null ? null : token.value;
      [topState, topSym] = stack.top();
      const action = this.parseTable.getAction(topState, nextSym);
      if (action == null) {
        throw new UnexpectedTokenError(token);
      } else if (action.tag == LRActionType.ACCEPT) {
        break;
      } else if (action.tag == LRActionType.SHIFT) {
        const nextState = action.nextState;
        stack.push(nextState, nextSym);
      } else {
        // reduce
        assert(action.nonterm != null, "Nonterm and ruleindex must be provided for a reduction action");
        const rule = action.nonterm.rules[action.ruleIndex];
        const ruleLen = rule.length;
        // pop this many items off the stack
        for (let i = 0; i < ruleLen; i++) stack.pop();
        [topState, topSym] = stack.top();
        const newAction = this.parseTable.getAction(topState, action.nonterm);
        assert(newAction != null, "Top item does not have an action.");
        stack.push(newAction.nextState, action.nonterm);
        // TODO:
        // Output the prduction A -> rule - as part of PTN building
      }
    } while (true); // !stack.isEmpty);
    */
    return null;
  }
}
