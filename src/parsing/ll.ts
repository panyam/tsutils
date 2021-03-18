import { Sym, Str, Grammar } from "./grammar";
import { Token } from "./tokenizer";
import { Tokenizer, PTNode, PTNTerm, PTNNonTerm, Parser as ParserBase, ParseTable, ParseTableItem } from "./parser";
import { Nullable } from "../types";
import { assert } from "../utils/misc";

export class LL1ParseTable extends ParseTable {
  refresh(): void {
    super.refresh();
    this.grammar.forEachRule((nt, rule, index) => {
      this.processRule(nt, rule, index);
    });
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
  readonly Grammar: Grammar;
  readonly parseTable: ParseTable;
  readonly ptnStack: PTNode[];
  readonly rootNode: PTNode;
  readonly stack: Sym[];
  constructor(g: Grammar, parseTable: ParseTable) {
    this.ptnStack = [];
    this.parseTable = parseTable;
    assert(g.startSymbol != null, "Start symbol not selected");
    this.rootNode = new PTNNonTerm(g.startSymbol);
    this.stack = [g.Eof, g.startSymbol!];
  }

  top(): Sym {
    return this.stack[this.stack.length - 1];
  }

  pop(): Sym {
    return this.stack.pop()!;
  }

  push(val: Sym): void {
    this.stack.push(val);
  }

  pushStr(str: Str): void {
    for (let i = str.syms.length - 1; i >= 0; i--) {
      this.stack.push(str.syms[i]);
    }
  }

  get isEmpty(): boolean {
    return this.stack.length == 0;
  }
}

export class LLParser extends ParserBase {
  parseTable: ParseTable;
  constructor(grammar: Grammar, parseTable?: ParseTable) {
    super(grammar);
    this.parseTable = parseTable || new LL1ParseTable(grammar);
  }

  /**
   * Parses the input and returns the resulting root Parse Tree node.
   */
  parse(tokenizer: Tokenizer): Nullable<PTNode> {
    const g = this.grammar;
    const stack = new ParseStack(this.grammar, this.parseTable);
    do {
      const topItem = stack.top();
      const token = tokenizer.peek();
      const nextSym = token == null ? g.Eof : this.getSym(token);
      const nextValue = token == null ? null : token.value;
      if (topItem.isTerminal) {
        if (topItem == nextSym) {
          // Something must happen here to stack symbol to build
          // the parse tree
          this.popAndReduce(tokenizer, stack, nextSym, nextValue);
        } else {
          this.processInvalidToken(tokenizer, stack, nextSym, nextValue);
        }
      } else {
        const entries = this.parseTable.get(topItem, nextSym);
        if (entries.length != 1) {
          this.processInvalidReductions(tokenizer, stack, nextSym, nextValue, entries);
        } else {
          // TODO: Something with the reduction
          stack.pop();
          stack.push(entries[0].nt);
        }
      }
    } while (!stack.isEmpty);
    return stack.rootNode;
  }

  popAndReduce(tokenizer: Tokenizer, stack: ParseStack, nextSym: Sym, nextToken: Token): void {
    tokenizer.next();
    stack.pop();
  }

  processInvalidToken(tokenizer: Tokenizer, stack: ParseStack, nextSym: Sym, nextValue: any): boolean {
    throw new Error("Invalid token: " + nextSym.label);
    return true;
  }

  processInvalidReductions(
    tokenizer: Tokenizer,
    stack: ParseStack,
    nextSym: Sym,
    nextValue: any,
    entries: ParseTableItem[],
  ): boolean {
    throw new Error("Invalid # reductions found: " + entries.length);
    return true;
  }
}
