import { Lit, NonTerm, Term, Str, Grammar } from "./grammar";
import { Token } from "./tokenizer";
import { Tokenizer, PTNode, Parser as ParserBase, ParseTable, ParseTableItem } from "./parser";
import { Nullable } from "../types";
import { assert } from "../utils/misc";

export class LL1ParseTable extends ParseTable {
  refresh(): void {
    super.refresh();
    this.grammar.forEachRule((nt, rule, index) => {
      this.processRule(nt, rule, index);
    });
  }

  processRule(nt: NonTerm, rule: Str, index: number): void {
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
    assert(g.startSymbol != null, "Start symbol not selected");
    const stack: Lit[] = [g.Eof, g.startSymbol!];
    const ptnodeStack: PTNode[] = [new PTNode("ROOT", null)];
    do {
      const topItem = stack.pop()!;
      const token = tokenizer.peek();
      const nextLit = token == null ? g.Eof : this.getLit(token);
      const nextValue = token == null ? null : token.value;
      if (topItem.isTerminal) {
        if (topItem == nextLit) {
          // Something must happen here to stack symbol to build
          // the parse tree
          this.popAndReduce(stack, nextLit, nextValue);
          tokenizer.next();
        } else {
          this.processInvalidToken(stack, nextLit, nextValue);
        }
      } else {
        const entries = this.parseTable.get(topItem as NonTerm, nextLit);
        if (entries.length != 0) {
          this.processInvalidReductions(stack, nextLit, nextValue, entries);
        } else {
          // TODO: Something with the reduction
          stack.pop();
          stack.push(entries[0].nt);
        }
      }
    } while (stack.length > 0);
    return null;
  }

  popAndReduce(stack: Lit[], nextLit: Lit, nextToken: Token): void {
    stack.pop();
  }

  processInvalidToken(stack: Lit[], nextLit: Lit, nextValue: any): boolean {
    return true;
  }

  processInvalidReductions(stack: Lit[], nextLit: Lit, nextValue: any, entries: ParseTableItem[]): boolean {
    return true;
  }
}
