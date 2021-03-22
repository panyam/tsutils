import { Sym, Grammar } from "./grammar";
import { Token } from "./tokenizer";
import { Tokenizer, PTNode, Parser as ParserBase } from "./parser";
import { NumMap, Nullable } from "../types";
import { UnexpectedTokenError } from "./errors";
import { assert } from "../utils/misc";
import { LRItemGraph } from "./lritems";

export enum LRActionType {
  ACCEPT,
  SHIFT,
  REDUCE,
  ERROR,
  NONE, // can *ONLY* be valid for non-terms as this falls to a GOTO
}

interface LRAction {
  // Type of action
  tag: LRActionType;

  // Next state to go to after performing the action (if valid).
  nextState: PTState;

  // NT of the rule to be used if action is REDUCE
  nonterm: Nullable<Sym>;

  // Index of the rule to be used if action is REDUCE
  ruleIndex: number;
}

/**
 * ParseTable state entry.
 */
export class PTState {
  /**
   * Parse
   */
  readonly id: number;

  constructor(id: number) {
    this.id = id;
  }
}

/**
 * A base LR parse table with actions for each parse state.
 */
export class ParseTable {
  readonly grammar: Grammar;
  readonly states: PTState[] = [];
  readonly itemGraph: LRItemGraph;

  /**
   * Maps symbol (by id) to the action;
   */
  actions: NumMap<NumMap<LRAction>> = {};

  constructor(grammar: Grammar) {
    this.grammar = grammar;
    this.itemGraph = new LRItemGraph(grammar);
    this.refresh();
  }

  /**
   * Gets the action for a given sym from a given state.
   */
  getAction(state: number, next: Sym): Nullable<LRAction> {
    return this.actions[state][next.id] || null;
  }

  /**
   * Evaluate all Parse States for this grammar and compute the parse table.
   */
  refresh(): void {
    // Use the Augmented rule S' -> S as start state
    // Start state is the closure of (S' -> S)
    this.itemGraph.refresh();
  }
}

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

export class LRParser extends ParserBase {
  parseTable: ParseTable;
  constructor(grammar: Grammar, parseTable?: ParseTable) {
    super(grammar);
    this.parseTable = parseTable || new ParseTable(grammar);
  }

  /**
   * Parses the input and returns the resulting root Parse Tree node.
   */
  parse(tokenizer: Tokenizer): Nullable<PTNode> {
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
      const action = topState.getAction(nextSym);
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
        const newAction = topState.getAction(action.nonterm);
        assert(newAction != null, "Top item does not have an action.");
        stack.push(newAction.nextState, action.nonterm);
        // TODO:
        // Output the prduction A -> rule - as part of PTN building
      }
    } while (true); // !stack.isEmpty);
    return null;
  }
}
