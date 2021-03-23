import { Grammar } from "../grammar";
import { EBNFParser } from "../ebnf";
import { LRAction, ParseTable } from "../lrbase";
import { LR1ItemGraph } from "../lr1";
import { makeLRParseTable } from "../ptables";
import { Goto, Shift, Reduce, expectPTableActions } from "./utils";

const g1 = new EBNFParser(` S -> C C ; C -> c C | d ; `).grammar.augmentStartSymbol("E1");

describe("LR ParseTable", () => {
  test("Test Basic", () => {
    const [ptable, ig] = makeLRParseTable(g1);
    const EOF = g1.Eof.label;
    // for (let i = 0; i < ig.itemSets.length; i++) { console.log("Set ", i, ": \n", ig.itemSets[i].printed()); }
    console.log("Actions: ", ptable.debugValue);
    expectPTableActions(g1, ptable, ig, 0, {
      id: [Shift(ig, 5)],
      PLUS: [],
      STAR: [],
      "<EOF>": [],
      OPEN: [Shift(ig, 4)],
      E: [Goto(ig, 1)],
      T: [Goto(ig, 2)],
      F: [Goto(ig, 3)],
    });

    expectPTableActions(g1, ptable, ig, 1, {
      PLUS: [Shift(ig, 6)],
      "<EOF>": [LRAction.Accept()],
    });

    expectPTableActions(g1, ptable, ig, 2, {
      PLUS: [Reduce(g1, "E", 1)],
      STAR: [Shift(ig, 7)],
      CLOSE: [Reduce(g1, "E", 1)],
      "<EOF>": [Reduce(g1, "E", 1)],
    });

    expectPTableActions(g1, ptable, ig, 3, {
      PLUS: [Reduce(g1, "T", 1)],
      STAR: [Reduce(g1, "T", 1)],
      CLOSE: [Reduce(g1, "T", 1)],
      "<EOF>": [Reduce(g1, "T", 1)],
    });

    expectPTableActions(g1, ptable, ig, 4, {
      OPEN: [Shift(ig, 4)],
      id: [Shift(ig, 5)],
      E: [Goto(ig, 8)],
      T: [Goto(ig, 2)],
      F: [Goto(ig, 3)],
    });

    expectPTableActions(g1, ptable, ig, 5, {
      PLUS: [Reduce(g1, "F", 1)],
      STAR: [Reduce(g1, "F", 1)],
      CLOSE: [Reduce(g1, "F", 1)],
      "<EOF>": [Reduce(g1, "F", 1)],
    });

    expectPTableActions(g1, ptable, ig, 6, {
      OPEN: [Shift(ig, 4)],
      id: [Shift(ig, 5)],
      T: [Goto(ig, 9)],
      F: [Goto(ig, 3)],
    });

    expectPTableActions(g1, ptable, ig, 7, {
      OPEN: [Shift(ig, 4)],
      id: [Shift(ig, 5)],
      F: [Goto(ig, 10)],
    });

    expectPTableActions(g1, ptable, ig, 8, {
      PLUS: [Shift(ig, 6)],
      CLOSE: [Shift(ig, 11)],
    });

    expectPTableActions(g1, ptable, ig, 9, {
      PLUS: [Reduce(g1, "E", 0)],
      STAR: [Shift(ig, 7)],
      CLOSE: [Reduce(g1, "E", 0)],
      "<EOF>": [Reduce(g1, "E", 0)],
    });

    expectPTableActions(g1, ptable, ig, 10, {
      PLUS: [Reduce(g1, "T", 0)],
      STAR: [Reduce(g1, "T", 0)],
      CLOSE: [Reduce(g1, "T", 0)],
      "<EOF>": [Reduce(g1, "T", 0)],
    });

    expectPTableActions(g1, ptable, ig, 11, {
      PLUS: [Reduce(g1, "F", 0)],
      STAR: [Reduce(g1, "F", 0)],
      CLOSE: [Reduce(g1, "F", 0)],
      "<EOF>": [Reduce(g1, "F", 0)],
    });
  });
});

const g2 = new EBNFParser(`
  S -> L EQ R ;
  S -> R ;
  L -> STAR R ;
  L -> id ;
  R -> L ;
`).grammar.augmentStartSymbol("S1");

describe("LRParseTable with Conflicts", () => {
  test("Test1", () => {
    const [ptable, ig] = makeLRParseTable(g2);
    const EOF = g1.Eof.label;
  });
});
