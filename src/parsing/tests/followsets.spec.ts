import { FirstSets, NullableSet, FollowSets } from "../sets";
import { EBNFParser } from "../ebnf";
import { expectNullables, expectFSEntries } from "./utils";
import Samples from "./samples";

describe("FollowSet Tests", () => {
  test("Tests 1", () => {
    const g = new EBNFParser(` A -> a b c ; `).grammar;

    const ns = new NullableSet(g);
    const fs = new FollowSets(g, new FirstSets(g, ns));
    expectFSEntries(g, fs, { A: [g.Eof.label] });
  });

  test("Tests 2", () => {
    const g = new EBNFParser(` A -> B a ; B -> b ; `).grammar;

    const ns = new NullableSet(g);
    const firstSets = new FirstSets(g, ns);
    const fs = new FollowSets(g, firstSets);
    expectFSEntries(g, fs, {
      A: [g.Eof.label],
      B: ["a"],
    });
  });

  test("Tests 3", () => {
    const g = new EBNFParser(Samples.expr2).grammar;

    const ns = new NullableSet(g);
    const firstSets = new FirstSets(g, ns);
    expectFSEntries(g, firstSets, {
      E: ["OPEN", "id"],
      T: ["OPEN", "id"],
      F: ["OPEN", "id"],
      E1: ["PLUS", ""],
      T1: ["STAR", ""],
    });

    const fs = new FollowSets(g, firstSets);
    expectFSEntries(g, fs, {
      E: [g.Eof.label, "CLOSE"],
      E1: [g.Eof.label, "CLOSE"],
      T: [g.Eof.label, "PLUS", "CLOSE"],
      T1: [g.Eof.label, "PLUS", "CLOSE"],
      F: [g.Eof.label, "PLUS", "STAR", "CLOSE"],
    });
  });

  test("Tests 4", () => {
    const g = new EBNFParser(`
      E -> T X ;
      X -> PLUS E | ;
      T -> int Y | OPEN E CLOSE ;
      Y -> STAR T | ;
    `).grammar;

    const ns = new NullableSet(g);
    const firstSets = new FirstSets(g, ns);
    expectFSEntries(g, firstSets, {
      // int: ["int"],
      // PLUS: ["PLUS"],
      // STAR: ["STAR"],
      // OPEN: ["OPEN"],
      // CLOSE: ["CLOSE"],
      Y: ["STAR", ""],
      X: ["PLUS", ""],
      T: ["int", "OPEN"],
      E: ["int", "OPEN"],
    });

    const fs = new FollowSets(g, firstSets);
    expectFSEntries(g, fs, {
      Y: [g.Eof.label, "CLOSE", "PLUS"],
      X: [g.Eof.label, "CLOSE"],
      T: [g.Eof.label, "PLUS", "CLOSE"],
      E: [g.Eof.label, "CLOSE"],
    });
  });

  test("Tests 5", () => {
    const g = new EBNFParser(Samples.Sample4).grammar;

    const ns = new NullableSet(g);
    expectNullables(ns, ["V", "W"]);
    const firstSets = new FirstSets(g, ns);
    expectFSEntries(g, firstSets, {
      S: ["a", "e", "d", "c", "f"],
      T: ["a", "e"],
      U: ["f"],
      V: ["c", ""],
      W: ["d", ""],
    });

    const followSets = new FollowSets(g, firstSets);
    expectFSEntries(g, followSets, {
      S: [g.Eof.label],
      T: ["f", g.Eof.label],
      U: [g.Eof.label, "a", "b", "c", "d", "e"],
      V: [g.Eof.label, "d", "f"],
      W: [g.Eof.label, "d", "c", "f"],
    });
  });
});
