import { FirstSets, NullableSet } from "../sets";
import { EBNFParser } from "../ebnf";
import { expectFSEntries } from "./utils";
import Samples from "./samples";

describe("First Sets tests", () => {
  test("First Tests 1", () => {
    const g = new EBNFParser(Samples.Sample5).grammar;

    const ns = new NullableSet(g);
    const fs = new FirstSets(g, ns);
    expectFSEntries(g, fs, {
      S: ["a", "b", "c"],
      A: ["a", "b", "c"],
      B: ["b"],
      C: ["c"],
    });
  });

  test("First Tests 3", () => {
    const g = new EBNFParser(Samples.expr1).grammar;
    const ns = new NullableSet(g);
    const fs = new FirstSets(g, ns);
    expectFSEntries(g, fs, {
      S: ["OPA", "LP", "NUM"],
    });
  });
});
