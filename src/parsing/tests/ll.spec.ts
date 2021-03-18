import { Term, Grammar } from "../grammar";
import { FirstSets, NullableSet, FollowSets } from "../sets";
import { EBNFParser } from "../ebnf";
import { assert } from "../../utils/misc";
import { ParseTable, LL1ParseTable } from "../ll";
import { printGrammar } from "../utils";
import { expectFSEntries } from "./utils";

function expectPTabEntries(
  g: Grammar,
  ptab: ParseTable,
  entries: [string, string, [string, number, number][]][],
): void {
  for (let e = 0; e < entries.length; e++) {
    const [ntL, termL, ents] = entries[e];
    ents.sort();
    const nt = g.getNT(ntL)!;
    const term = termL == g.Eof.label ? g.Eof : g.getLit(termL) as Term;
    const ptEntry = ptab.get(nt, term) || [];
    ptEntry.sort();
    expect(ptEntry.length).toEqual(ents.length);
    for (let i = 0; i < ents.length; i++) {
      const [expNT, expRI, expPos] = ents[i];
      const [foundNT, foundRI, foundPos] = ptEntry[i];
      if (expNT != foundNT.label || expRI != foundRI || expPos != foundPos) {
        assert(
          false,
          `Entry: ${e}, Rule: ${i}, Expected: ${[expNT, expRI, expPos]}, Found: ${[foundNT.label, foundRI, foundPos]}`,
        );
      }
      expect(expNT).toEqual(foundNT.label);
      expect(expRI).toEqual(foundRI);
      expect(expPos).toEqual(foundPos);
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
});
