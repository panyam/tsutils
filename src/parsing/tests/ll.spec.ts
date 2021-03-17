import { Grammar } from "../grammar";
import { FirstSets, NullableSet, FollowSets } from "../sets";
import { EBNFParser } from "../ebnf";
import { assert } from "../../utils/misc";
import { LL1ParseTable } from "../ll";
import { printGrammar } from "../utils";

describe("LLParseTable Tests", () => {
  test("Tests 1", () => {
    const g = new EBNFParser(`
      S : i E t S s1 | a;
      S1 : e S | ;
      E : b ;
    `).grammar;

    const ns = new NullableSet(g);
    const fs = new FirstSets(g, ns);
    const fls = new FollowSets(g, fs);
    const ptab = new LL1ParseTable(g, fls);
    expect(ptab.count).toBe(6);
  });
});
