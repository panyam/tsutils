import { NonTerm, Term, Exp, ExpType, Grammar } from "./grammar";
import { FollowSets } from "./sets";
import { Tokenizer } from "./tokenizer";
import { PTNode, Parser as ParserBase } from "./parser";
import { Nullable } from "../types";

export class ParseTable {
  followSets: FollowSets;
  readonly grammar: Grammar;
  constructor(grammar: Grammar, followSets?: FollowSets) {
    this.grammar = grammar;
    this.followSets = followSets || new FollowSets(grammar);
    this.refresh();
  }

  refresh(): void {
    this.followSets.refresh();
    this.grammar.nonTerminals.forEach((nt) => this.processRule(nt, nt.rules));
  }

  processRule(nt: NonTerm, rules: Exp): void {
    const fs = this.followSets.firstSets;
    //   if (fs.
    //
  }
}

export class LLParser extends ParserBase {
  parseTable: ParseTable;
  constructor(grammar: Grammar, tokenizer: Tokenizer, parseTable: ParseTable) {
    super(grammar, tokenizer);
    this.parseTable = parseTable;
  }

  parse(): Nullable<PTNode> {
    /*
    const stack = [];
    const tokenizer = this.tokenizer;
    while (true) {
      const topItem = stack.top();
      const a = tokenizer.peek();
      if (topItem.isTerminal == ExpType.TERM or topItem == grammar.Eof) {
        if (topItem == a) {
          tokenizer.next();
          stack.pop();
        } else {
          error();
        }
      } else {
        const (exp, prod) = parseTable.get(topItem, a));
        if (exp == null) error();
        else {
          stack.pop();
          stack.push(prod);
          emit(exp, prod);
        }
      }
      if (topItem == grammar.Eof) break;
    }
    */
    return null;
  }
}
