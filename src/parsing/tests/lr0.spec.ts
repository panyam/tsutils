import { EBNFParser } from "../ebnf";
import { LRItemSet } from "../lrbase";
import { LR0Item, LR0ItemGraph } from "../lr0";
import { Grammar } from "../grammar";
import { assert } from "../../utils/misc";

function From(ig: LR0ItemGraph, ...entries: [string, number, number][]): LRItemSet {
  const items = entries.map(([label, ri, pos]) => ig.getItem(new LR0Item(ig.grammar.getSym(label)!, ri, pos)).id);
  const set = new LRItemSet(ig, ...items);
  return ig.getItemSet(set);
}

export function expectItemSet(g: Grammar, set: LRItemSet, entries: [string, number, number][]): void {
  const ig = set.itemGraph;
  expect(set.size).toBe(entries.length);
  for (const [sym, index, pos] of entries) {
    const nt = g.getSym(sym);
    assert(nt != null, "Cannot find symbol: " + sym);
    expect(set.has(ig.getItem(new LR0Item(nt, index, pos)).id)).toBe(true);
  }
}

const g1 = new EBNFParser(`
  E -> E PLUS T | T ;
  T -> T STAR F | F ;
  F -> OPEN E CLOSE | id ;
`).grammar.augmentStartSymbol("E1");

describe("LRItem", () => {
  test("Test Equality", () => {
    const ig = new LR0ItemGraph(g1);
    const set1 = From(ig, ["E", 0, 0], ["E", 0, 0]);
    expect(set1.size).toBe(2);
  });

  test("Test Advance", () => {
    const ig = new LR0ItemGraph(g1);
    const E = g1.getSym("E")!;
    const l1 = ig.getItem(new LR0Item(E, 1));
    const l1a = ig.getItem(new LR0Item(E, 1));
    expect(l1.equals(l1a)).toBe(true);
    expect(l1.key).toEqual(`${E.id}:1:0`);
    const l2 = l1.advance();
    expect(l2.nt.equals(l1.nt)).toBe(true);
    expect(l2.ruleIndex).toEqual(l1.ruleIndex);
    expect(l2.position).toEqual(l1.position + 1);
    expect(() => l2.advance()).toThrowError();
  });
});

describe("LRItemSet", () => {
  test("Test Closure", () => {
    const ig = new LR0ItemGraph(g1);
    const s1 = ig.startSet();
    const s2 = ig.startSet();
    expect(s1.equals(s2)).toBe(true);
    expect(ig.itemSets.length).toBe(1);
    expectItemSet(g1, s1, [
      ["E1", 0, 0],
      ["E", 0, 0],
      ["E", 1, 0],
      ["T", 0, 0],
      ["T", 1, 0],
      ["F", 0, 0],
      ["F", 1, 0],
    ]);
  });
});

describe("LR0ItemGraph", () => {
  test("Test Basic", () => {
    const ig = new LR0ItemGraph(g1).refresh();

    expect(ig.size).toBe(12);
    expect(
      ig.hasItemSet(
        From(ig, ["E1", 0, 0], ["E", 0, 0], ["E", 1, 0], ["T", 0, 0], ["T", 1, 0], ["F", 0, 0], ["F", 1, 0]),
      ),
    );
    expect(ig.hasItemSet(From(ig, ["E1", 0, 1], ["E", 0, 1])));
    // Set I2
    expect(ig.hasItemSet(From(ig, ["E", 1, 1], ["T", 0, 1])));
    // Set 3
    expect(ig.hasItemSet(From(ig, ["T", 1, 1])));

    // Set 4
    expect(
      ig.hasItemSet(
        From(ig, ["F", 0, 1], ["E", 0, 0], ["E", 1, 0], ["T", 0, 0], ["T", 1, 0], ["F", 0, 0], ["F", 1, 0]),
      ),
    );

    // Set 5
    expect(ig.hasItemSet(From(ig, ["F", 1, 1])));

    // Set 6
    expect(ig.hasItemSet(From(ig, ["E", 0, 2], ["T", 0, 0], ["T", 1, 0], ["F", 0, 0], ["F", 1, 0])));

    // Set 7
    expect(ig.hasItemSet(From(ig, ["T", 0, 2], ["F", 0, 0], ["F", 1, 0])));

    // Set 8
    expect(ig.hasItemSet(From(ig, ["F", 0, 2], ["E", 0, 1])));

    // Set 9
    expect(ig.hasItemSet(From(ig, ["E", 0, 3], ["T", 0, 1])));

    // Set 10
    expect(ig.hasItemSet(From(ig, ["T", 0, 3])));

    // Set 11
    expect(ig.hasItemSet(From(ig, ["F", 0, 3])));
  });
});

const g2 = new EBNFParser(`
  S -> L EQ R ;
  S -> R ;
  L -> STAR R ;
  L -> id ;
  R -> L ;
`).grammar.augmentStartSymbol("S1");

describe("LR0ItemGraph with Conflicts", () => {
  test("Test1", () => {
    const ig = new LR0ItemGraph(g2).refresh();

    expect(ig.size).toBe(10);
    // Set 0
    expect(ig.hasItemSet(From(ig, ["S1", 0, 0], ["S", 0, 0], ["S", 1, 0], ["L", 0, 0], ["L", 1, 0], ["R", 0, 0])));

    // Set 1
    expect(ig.hasItemSet(From(ig, ["S1", 0, 1])));

    // Set I2
    expect(ig.hasItemSet(From(ig, ["S", 0, 1], ["R", 0, 1])));

    // Set 3
    expect(ig.hasItemSet(From(ig, ["S", 1, 1])));

    // Set 4
    expect(ig.hasItemSet(From(ig, ["L", 0, 1], ["R", 0, 0], ["L", 0, 0], ["L", 1, 0])));

    // Set 5
    expect(ig.hasItemSet(From(ig, ["L", 1, 1])));

    // Set 6
    expect(ig.hasItemSet(From(ig, ["S", 0, 2], ["R", 0, 0], ["L", 0, 0], ["L", 1, 0])));

    // Set 7
    expect(ig.hasItemSet(From(ig, ["L", 0, 2])));

    // Set 8
    expect(ig.hasItemSet(From(ig, ["R", 0, 1])));

    // Set 9
    expect(ig.hasItemSet(From(ig, ["S", 0, 3])));
  });
});
