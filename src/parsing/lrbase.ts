import { Sym, Grammar } from "./grammar";
import { Tokenizer, PTNode, Parser as ParserBase } from "./parser";
import { StringMap, NumMap, Nullable } from "../types";
import { assert } from "../utils/misc";
import { Token } from "./tokenizer";
import { UnexpectedTokenError } from "./errors";

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

export interface LRItem {
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

  reset(): void {
    this.gotoSets = {};
    this.itemSets = [];
    this.itemSetIndexes = {};
    this.items = [];
    this.itemIndexes = {};
    this.startSet();
  }

  refresh(): this {
    this.reset();
    this.evalGotoSets();
    return this;
  }

  /**
   * Computes all the goto sets used to create the graph of items.
   */
  protected evalGotoSets(): void {
    const out = this.itemSets;
    for (let i = 0; i < out.length; i++) {
      const currSet = out[i];
      for (const sym of this.grammar.allSymbols) {
        const gotoSet = this.goto(currSet, sym);
        if (gotoSet.size > 0) {
          this.setGoto(currSet, sym, gotoSet);
        }
      }
    }
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

  /**
   * Returns true if a particular item set exists in this item graph.
   */
  hasItemSet(itemSet: LRItemSet): boolean {
    return itemSet.key in this.itemSetIndexes;
  }

  /**
   * Gets an item set if it already exists otherwise it is created
   * and returned.
   * This method ensures that for any given itemset there is only
   * one copy of it (by value) in the graph and if two item sets
   * are equal by value then they must also be the same refernece.
   */
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

/**
 * A parsing table generator for SLR parsers.
 */
export class ParseTable {
  readonly grammar: Grammar;

  /**
   * Maps symbol (by id) to the action;
   */
  actions: NumMap<NumMap<LRAction[]>> = {};

  constructor(grammar: Grammar) {
    this.grammar = grammar;
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
    if (actions.findIndex((action) => action.equals(action)) < 0) {
      actions.push(action);
    }
  }

  get debugValue(): any {
    const out: any = {};
    for (const fromId in this.actions) {
      out[fromId] = {};
      for (const symId in this.actions[fromId]) {
        const sym = this.grammar.getSymById(symId as any)!;
        const actions = this.actions[fromId][sym.id] || [];
        if (actions.length > 0) {
          out[fromId][sym.label] = actions.map((a) => a.toString());
        }
      }
    }
    return out;
  }
}

export class ParseStack {
  readonly grammar: Grammar;
  readonly parseTable: ParseTable;
  // A way of marking the kind of item that is on the stack
  // true => isStateId
  // false => isSymbolId
  readonly stateStack: LRItemSet[] = [];
  readonly nodeStack: PTNode[] = []; // TBD
  constructor(g: Grammar, parseTable: ParseTable) {
    this.grammar = g;
    this.parseTable = parseTable;
    assert(g.startSymbol != null, "Start symbol not selected");
  }

  push(state: LRItemSet, node: PTNode): void {
    this.stateStack.push(state);
    this.nodeStack.push(node);
  }

  top(): [LRItemSet, PTNode] {
    return [this.stateStack[this.stateStack.length - 1], this.nodeStack[this.nodeStack.length - 1]];
  }

  pop(): [LRItemSet, PTNode] {
    if (this.isEmpty) {
      assert(false, "Stack is empty.");
    }
    const state = this.stateStack.pop() as LRItemSet;
    const node = this.nodeStack.pop() as PTNode;
    return [state, node];
  }

  get isEmpty(): boolean {
    return this.stateStack.length == 0 || this.nodeStack.length == 0;
  }
}

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
    const g = this.grammar;
    const stack = new ParseStack(this.grammar, this.parseTable);
    while (tokenizer.peek() != null || !stack.isEmpty) {
      const token = tokenizer.peek();
      const nextSym = token == null ? g.Eof : this.getSym(token);
      const nextValue = token == null ? null : token.value;
      let [topState, topNode] = stack.top();
      const actions = this.parseTable.getActions(topState, nextSym);
      if (actions == null || actions.length == 0) {
        throw new UnexpectedTokenError(token);
      }

      const action = this.resolveActions(actions, stack, tokenizer);
      if (action.tag == LRActionType.ACCEPT) {
        break;
      } else if (action.tag == LRActionType.SHIFT) {
        const newNode = new PTNode(nextSym, nextValue);
        stack.push(action.nextState!, newNode);
      } else {
        // reduce
        assert(action.nonterm != null, "Nonterm and ruleindex must be provided for a reduction action");
        const rule = action.nonterm.rules[action.ruleIndex];
        const ruleLen = rule.length;
        // pop this many items off the stack and create a node
        // from this
        const newNode = new PTNode(action.nonterm);
        for (let i = 0; i < ruleLen; i++) {
          const [_, node] = stack.pop();
          newNode.children.splice(0, 0, node);
        }
        [topState, topNode] = stack.top();
        const newAction = this.resolveActions(this.parseTable.getActions(topState, action.nonterm), stack, tokenizer);
        assert(newAction != null, "Top item does not have an action.");
        stack.push(newAction.nextState!, newNode);
        this.notifyReduction(newNode, action.ruleIndex);
      }
    }
    while (true); // !stack.isEmpty);
    return null;
  }

  /**
   * called when a reduction has been performed.  At this time
   * all the children have already been reduced (and called with
   * this method).  Now is the opportunity for the parent node
   * reduction to perform custom actions.  Note that this method
   * cannot modify the stack.  It can only be used to perform
   * things like AST building or logging etc.
   */
  notifyReduction(node: PTNode, ruleIndex: number): void {
    //
  }

  /**
   * Pick an action among several actions based on several factors (eg curr parse stack, tokenizer etc).
   */
  resolveActions(actions: LRAction[], stack: ParseStack, tokenizer: Tokenizer): LRAction {
    if (actions.length > 1) {
      throw new Error("Multiple actions found.");
    }
    return actions[0];
  }
}
