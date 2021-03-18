import { Nullable } from "../../types";
import { Term, Grammar } from "../grammar";
import { FirstSets, NullableSet, FollowSets } from "../sets";
import { EBNFParser } from "../ebnf";
import { assert } from "../../utils/misc";
import { LL1ParseTable, LLParser } from "../ll";
import { ParseTable, Tokenizer } from "../parser";
import { Token } from "../tokenizer";
import { expectFSEntries } from "./utils";
import Samples from "./samples";

export class MockTokenizer implements Tokenizer {
  tokens: Token[];
  current = 0;
  peeked: Nullable<Token> = null;
  constructor(...tokens: Token[]) {
    this.tokens = tokens;
  }

  peek(): Nullable<Token> {
    if (!this.peeked && this.current < this.tokens.length) {
      this.peeked = this.tokens[this.current];
    }
    return this.peeked;
  }

  next(): Nullable<Token> {
    const out = this.peek();
    this.current++;
    return out;
  }
}

function expectPTabEntries(
  g: Grammar,
  ptab: ParseTable,
  entries: [string, string, [string, number, number][]][],
): void {
  for (let e = 0; e < entries.length; e++) {
    const [ntL, termL, ents] = entries[e];
    ents.sort();
    const nt = g.getNT(ntL)!;
    const term = termL == g.Eof.label ? g.Eof : (g.getLit(termL) as Term);
    const ptEntry = ptab.get(nt, term) || [];
    ptEntry.sort();
    expect(ptEntry.length).toEqual(ents.length);
    for (let i = 0; i < ents.length; i++) {
      const [expNT, expRI, expPos] = ents[i];
      const foundPTI = ptEntry[i];
      if (expNT != foundPTI.nt.label || expRI != foundPTI.ruleIndex || expPos != foundPTI.position) {
        assert(
          false,
          `Entry: ${e}, Rule: ${i}, Expected: ${[expNT, expRI, expPos]}, Found: ${[
            foundPTI.nt.label,
            foundPTI.ruleIndex,
            foundPTI.position,
          ]}`,
        );
      }
      expect(expNT).toEqual(foundPTI.nt.label);
      expect(expRI).toEqual(foundPTI.ruleIndex);
      expect(expPos).toEqual(foundPTI.position);
    }
  }
}

describe("LLParseTable Tests", () => {
  test("Tests 1", () => {
    const g = new EBNFParser(`
      S : i E t S S1 | a;
      S1 : e S | ;
      E : b ;
    `).grammar;

    const ns = new NullableSet(g);
    const fs = new FirstSets(g, ns);
    expectFSEntries(g, fs, {
      S: ["i", "a"],
      S1: ["e", ""],
      E: ["b"],
    });
    const fls = new FollowSets(g, fs);
    expectFSEntries(g, fls, {
      S: ["e", g.Eof.label],
      S1: ["e", g.Eof.label],
      E: ["t"],
    });
    const ptab = new LL1ParseTable(g, fls);
    expect(ptab.count).toBe(6);
    expectPTabEntries(g, ptab, [
      ["S", "a", [["S", 1, 0]]],
      ["S", "i", [["S", 0, 0]]],
      [
        "S1",
        "e",
        [
          ["S1", 0, 0],
          ["S1", 1, 0],
        ],
      ],
      ["S1", g.Eof.label, [["S1", 1, 0]]],
      ["E", "b", [["E", 0, 0]]],
    ]);
  });

  test("Tests 2", () => {
    const g = new EBNFParser(Samples.expr2).grammar;

    const ns = new NullableSet(g);
    const fs = new FirstSets(g, ns);
    const fls = new FollowSets(g, fs);
    const ptab = new LL1ParseTable(g, fls);
    expect(ptab.count).toBe(13);
    expectPTabEntries(g, ptab, [
      ["E", "id", [["E", 0, 0]]],
      ["E", "OPEN", [["E", 0, 0]]],
      ["E1", "PLUS", [["E1", 0, 0]]],
      ["E1", "CLOSE", [["E1", 1, 0]]],
      ["E1", g.Eof.label, [["E1", 1, 0]]],

      ["T", "id", [["T", 0, 0]]],
      ["T", "OPEN", [["T", 0, 0]]],

      ["T1", "PLUS", [["T1", 1, 0]]],
      ["T1", "STAR", [["T1", 0, 0]]],
      ["T1", "CLOSE", [["T1", 1, 0]]],
      ["T1", g.Eof.label, [["T1", 1, 0]]],

      ["F", "id", [["F", 1, 0]]],
      ["F", "OPEN", [["F", 0, 0]]],
    ]);
  });
});

describe("LLParser Tests", () => {
  test("Tests 1", () => {
    const g = new EBNFParser(Samples.expr2).grammar;

    const ns = new NullableSet(g);
    const fs = new FirstSets(g, ns);
    const fls = new FollowSets(g, fs);
    const ptab = new LL1ParseTable(g, fls);

    const tokenizer = new MockTokenizer(
      new Token("id", "A"),
      new Token("PLUS", "+"),
      new Token("id", "B"),
      new Token("STAR", "*"),
      new Token("id", "C"),
    );
    const parser = new LLParser(g);
    const root = parser.parse(tokenizer);
  });
});
