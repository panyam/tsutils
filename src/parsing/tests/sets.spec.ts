import { Null, ExpType, Exp, Grammar } from "../grammar";
import { FirstSets, NullableSet, FollowSets } from "../sets";
import { streamDict, mapStream, filterStream, collectStream } from "../../utils/streams";
import { EBNFParser } from "../ebnf";

function expectListsEqual(l1: string[], l2: string[]): void {
  l1 = l1.sort();
  l2 = l2.sort();
  expect(l1).toEqual(l2);
}

function expectFSEntries(g: Grammar, fs: FirstSets, nt: string, terms: string[]) {
  expectListsEqual(fs.entriesFor(g.nonterm(nt)).labels, terms);
}

describe("Nullable Tests", () => {
  test("Nullables Tests 1", () => {
    const g = new EBNFParser(`
      S : A C A ;
      A : a A a | B | C ;
      B : b B | b ;
      C : c C | ;
    `).grammar;

    const ns = new NullableSet(g).nonterms.map((n) => n.label).sort();
    expect(ns).toEqual(["A", "C", "S"]);
  });

  test("Nullables Tests 2", () => {
    const g = new EBNFParser(`
      S : A C A | C A | A A | A C | A | C | ;
      A : a A a | B | C ;
      B : b B | b ;
      C : c C | c ;
    `).grammar;

    const ns = new NullableSet(g).nonterms.map((n) => n.label).sort();
    expect(ns).toEqual(["S"]);
  });

  test("Nullables Tests 3", () => {
    const g = new EBNFParser(`
      S : A B C | a A | ;
      A : a A | ;
      B : b B | ;
      C : c C | ;
    `).grammar;

    const ns = new NullableSet(g).nonterms.map((n) => n.label).sort();
    expect(ns).toEqual(["A", "B", "C", "S"]);
  });

  test("Nullables Tests 4", () => {
    const g = new EBNFParser(`
      S : A C A | C A | A A | A C | A | C | ;
      A : a A | a;
      B : b B | b;
      C : c C | c;
    `).grammar;

    const ns = new NullableSet(g).nonterms.map((n) => n.label).sort();
    expect(ns).toEqual(["S"]);
  });
});

describe("First Sets tests", () => {
  test("First Tests 1", () => {
    const g = new EBNFParser(`
      S : A C A ;
      A : a A a | B | C ;
      B : b B | b;
      C : c C | c;
    `).grammar;

    const ns = new NullableSet(g);
    const fs = new FirstSets(g, ns);
    expectFSEntries(g, fs, "S", ["a", "b", "c"]);
    expectFSEntries(g, fs, "A", ["a", "b", "c"]);
    expectFSEntries(g, fs, "B", ["b"]);
    expectFSEntries(g, fs, "C", ["c"]);
  });
});
