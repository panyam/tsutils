import { Grammar } from "../grammar";
import { EBNFParser } from "../ebnf";
import { LRAction } from "../lr";
import { LRItemGraph } from "../lr0";
import { ParseTable } from "../slr";
import { StringMap } from "../../types";
import { assert } from "../../utils/misc";

const g1 = new EBNFParser(`
  E -> E PLUS T | T ;
  T -> T STAR F | F ;
  F -> OPEN E CLOSE | id ;
`).grammar.augmentStartSymbol("E1");

function Goto(ptab: ParseTable, newState: number): LRAction {
  return LRAction.Goto(ptab.itemGraph.itemSets[newState]);
}

function Shift(itemGraph: LRItemGraph, newState: number): LRAction {
  return LRAction.Shift(itemGraph.itemSets[newState]);
}

function Reduce(g: Grammar, nt: string, rule: number): LRAction {
  return LRAction.Reduce(g.getSym(nt)!, rule);
}

describe("LR ParseTable", () => {
  test("Test Basic", () => {
    const ptable = new ParseTable(g1);
    const ig = ptable.itemGraph;
    const EOF = g1.Eof.label;
    // for (let i = 0; i < ig.itemSets.length; i++) { console.log("Set ", i, ": \n", ig.itemSets[i].printed()); }
    // console.log("Actions: ", ptable.debugActions);
    expectPTableActions(g1, ptable, 0, {
      id: [Shift(ig, 5)],
      PLUS: [],
      STAR: [],
      "<EOF>": [],
      OPEN: [Shift(ig, 4)],
      E: [Goto(ptable, 1)],
      T: [Goto(ptable, 2)],
      F: [Goto(ptable, 3)],
    });

    expectPTableActions(g1, ptable, 1, {
      PLUS: [Shift(ig, 6)],
      "<EOF>": [LRAction.Accept()],
    });

    expectPTableActions(g1, ptable, 2, {
      PLUS: [Reduce(g1, "E", 1)],
      STAR: [Shift(ig, 7)],
      CLOSE: [Reduce(g1, "E", 1)],
      "<EOF>": [Reduce(g1, "E", 1)],
    });

    expectPTableActions(g1, ptable, 3, {
      PLUS: [Reduce(g1, "T", 1)],
      STAR: [Reduce(g1, "T", 1)],
      CLOSE: [Reduce(g1, "T", 1)],
      "<EOF>": [Reduce(g1, "T", 1)],
    });

    expectPTableActions(g1, ptable, 4, {
      OPEN: [Shift(ig, 4)],
      id: [Shift(ig, 5)],
      E: [Goto(ptable, 8)],
      T: [Goto(ptable, 2)],
      F: [Goto(ptable, 3)],
    });

    expectPTableActions(g1, ptable, 5, {
      PLUS: [Reduce(g1, "F", 1)],
      STAR: [Reduce(g1, "F", 1)],
      CLOSE: [Reduce(g1, "F", 1)],
      "<EOF>": [Reduce(g1, "F", 1)],
    });

    expectPTableActions(g1, ptable, 6, {
      OPEN: [Shift(ig, 4)],
      id: [Shift(ig, 5)],
      T: [Goto(ptable, 9)],
      F: [Goto(ptable, 3)],
    });

    expectPTableActions(g1, ptable, 7, {
      OPEN: [Shift(ig, 4)],
      id: [Shift(ig, 5)],
      F: [Goto(ptable, 10)],
    });

    expectPTableActions(g1, ptable, 8, {
      PLUS: [Shift(ig, 6)],
      CLOSE: [Shift(ig, 11)],
    });

    expectPTableActions(g1, ptable, 9, {
      PLUS: [Reduce(g1, "E", 0)],
      STAR: [Shift(ig, 7)],
      CLOSE: [Reduce(g1, "E", 0)],
      "<EOF>": [Reduce(g1, "E", 0)],
    });

    expectPTableActions(g1, ptable, 10, {
      PLUS: [Reduce(g1, "T", 0)],
      STAR: [Reduce(g1, "T", 0)],
      CLOSE: [Reduce(g1, "T", 0)],
      "<EOF>": [Reduce(g1, "T", 0)],
    });

    expectPTableActions(g1, ptable, 11, {
      PLUS: [Reduce(g1, "F", 0)],
      STAR: [Reduce(g1, "F", 0)],
      CLOSE: [Reduce(g1, "F", 0)],
      "<EOF>": [Reduce(g1, "F", 0)],
    });
  });
});

function expectPTableActions(g: Grammar, pt: ParseTable, fromSet: number, actions: StringMap<LRAction[]>): void {
  const itemSet = pt.itemGraph.itemSets[fromSet];
  for (const label in actions) {
    const sym = label == g.Eof.label ? g.Eof : g.getSym(label);
    assert(sym != null, `Symbol '${label}' not found`);
    const foundActions = pt.getActions(itemSet, sym);
    const expectedActions = actions[label];
    if (foundActions.length != expectedActions.length) {
      console.log("Action Mismatch: ", label, sym);
      expect(foundActions.length).toEqual(expectedActions.length);
    }
    for (let i = 0; i < foundActions.length; i++) {
      if (!foundActions[i].equals(expectedActions[i])) {
        assert(
          false,
          `State ${fromSet} - Action Mismatch for label ${label} at index: ${i}.  Found: ${foundActions[
            i
          ].toString()}, Expected: ${expectedActions[i].toString()}`,
        );
      }
    }
  }
}

const g2 = new EBNFParser(`
  S -> L EQ R ;
  S -> R ;
  L -> STAR R ;
  L -> id ;
  R -> L ;
`).grammar.augmentStartSymbol("S1");

describe("LRParseTable with Conflicts", () => {
  test("Test1", () => {
    const ptable = new ParseTable(g2);
    const ig = ptable.itemGraph;
    const EOF = g1.Eof.label;
    console.log("Actions: ", ptable.debugActions);
  });
});
