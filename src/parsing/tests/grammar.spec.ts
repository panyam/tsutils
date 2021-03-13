import { Null, ExpType, Exp, Grammar } from "../grammar";
import { FirstSets, NullableSet, FollowSets } from "../sets";
import { streamDict, mapStream, filterStream, collectStream } from "../../utils/streams";
import { EBNFParser } from "../ebnf";

function expectListsEqual(l1: string[], l2: string[]): void {
  l1 = l1.sort();
  l2 = l2.sort();
  expect(l1).toEqual(l2);
}

describe("Grammar Tests", () => {
  test("Constructor", () => {
    const g = new EBNFParser(`
      S : A B | C ;
      A : 0 B | C ;
      B : 1 | A 0 ;
      C : A C | C;
    `).grammar;

    expect(g.terminals.length).toBe(2);
    expect(() => g.term("A")).toThrowError();
    expect(g.nonterm("B").label).toBe("B");
    const ns = new NullableSet(g).nonterms.map((n) => n.label);
    expect(ns).toEqual([]);
  });
});
