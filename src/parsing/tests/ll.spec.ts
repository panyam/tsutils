import { Grammar } from "../grammar";
import { FirstSets, NullableSet, FollowSets } from "../sets";
import { EBNFParser } from "../ebnf";
import { assert } from "../../utils/misc";
import { LL1ParseTable } from "../ll";
import { printGrammar } from "../utils";
import { expectFSEntries } from "./utils";

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
      "S": ["i", "a"],
      "S1": ["e", ""],
      "E": ["b"],
    })
    const fls = new FollowSets(g, fs);
    expectFSEntries(g, fls, {
      "S": ["e", g.Eof.label],
      "S1": ["e", g.Eof.label],
      "E": ["t"],
    })
    const ptab = new LL1ParseTable(g, fls);
    expect(ptab.count).toBe(6);
  });
});
