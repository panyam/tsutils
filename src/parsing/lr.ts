import { Sym, Grammar } from "./grammar";
import { Token } from "./tokenizer";
import { Tokenizer, PTNode, Parser as ParserBase } from "./parser";
import { Nullable } from "../types";
import { UnexpectedTokenError } from "./errors";
import { assert } from "../utils/misc";
import { LRItemSet } from "./lritems";

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
  /*
  parseTable: ParseTable;
  constructor(grammar: Grammar, parseTable: ParseTable) {
    super(grammar);
    this.parseTable = parseTable;
  }
  */

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
