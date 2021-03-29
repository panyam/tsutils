import { EBNFParser } from "../ebnf";
import { LRItemSet } from "../lrbase";
import { LR0Item, LR0ItemGraph } from "../lr0";
import { Grammar } from "../grammar";
import { assert } from "../../utils/misc";
import { verifyItemGraphs } from "./utils";

function From(ig: LR0ItemGraph, ...entries: [string, number, number][]): LRItemSet {
  const items = entries.map(([label, ri, pos]) => ig.items.ensure(new LR0Item(ig.grammar.getRule(label, ri), pos)).id);
  const set = new LRItemSet(ig, ...items);
  return ig.itemSets.ensure(set);
}

export function expectItemSet(g: Grammar, set: LRItemSet, entries: [string, number, number][]): void {
  const ig = set.itemGraph;
  expect(set.size).toBe(entries.length);
  for (const [sym, index, pos] of entries) {
    const nt = g.getSym(sym);
    assert(nt != null, "Cannot find symbol: " + sym);
    expect(set.has(ig.items.ensure(new LR0Item(g.getRule(nt, index), pos)).id)).toBe(true);
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
    const ig = new LR0ItemGraph(g1).refresh();
    const E = g1.getSym("E")!;
    const rule = g1.getRule(E, 1);
    const l1 = ig.items.ensure(new LR0Item(rule));
    const l1a = ig.items.ensure(new LR0Item(rule));
    expect(l1.equals(l1a)).toBe(true);
    expect(l1.key).toEqual(`${rule.id}:0`);
    const l2 = l1.advance();
    expect(l2.rule.equals(l1.rule)).toBe(true);
    expect(l2.position).toEqual(l1.position + 1);
    expect(() => l2.advance()).toThrowError();
  });
});

describe("LRItemSet", () => {
  test("Test Closure", () => {
    const ig = new LR0ItemGraph(g1).refresh();
    verifyItemGraphs(ig, {
        '0': {
          items: [
            'E1 ->  . E',
            'E ->  . E PLUS T',
            'E ->  . T',
            'T ->  . T STAR F',
            'T ->  . F',
            'F ->  . OPEN E CLOSE',
            'F ->  . id'
          ],
          next: { E: 1, T: 2, F: 3, OPEN: 4, id: 5 }
        },
        '1': { items: [ 'E1 -> E . ', 'E -> E . PLUS T' ], next: { PLUS: 6 } },
        '2': { items: [ 'T -> T . STAR F', 'E -> T . ' ], next: { STAR: 7 } },
        '3': { items: [ 'T -> F . ' ], next: {} },
        '4': {
          items: [
            'E ->  . E PLUS T',
            'F -> OPEN . E CLOSE',
            'E ->  . T',
            'T ->  . T STAR F',
            'T ->  . F',
            'F ->  . OPEN E CLOSE',
            'F ->  . id'
          ],
          next: { E: 8, T: 2, F: 3, OPEN: 4, id: 5 }
        },
        '5': { items: [ 'F -> id . ' ], next: {} },
        '6': {
          items: [
            'E -> E PLUS . T',
            'T ->  . T STAR F',
            'T ->  . F',
            'F ->  . OPEN E CLOSE',
            'F ->  . id'
          ],
          next: { T: 9, F: 3, OPEN: 4, id: 5 }
        },
        '7': {
          items: [ 'T -> T STAR . F', 'F ->  . OPEN E CLOSE', 'F ->  . id' ],
          next: { F: 10, OPEN: 4, id: 5 }
        },
        '8': {
          items: [ 'F -> OPEN E . CLOSE', 'E -> E . PLUS T' ],
          next: { PLUS: 6, CLOSE: 11 }
        },
        '9': {
          items: [ 'T -> T . STAR F', 'E -> E PLUS T . ' ],
          next: { STAR: 7 }
        },
        '10': { items: [ 'T -> T STAR F . ' ], next: {} },
        '11': { items: [ 'F -> OPEN E CLOSE . ' ], next: {} }
      }, true);
  });
});

describe("LR0ItemGraph", () => {
  test("Test Basic", () => {
    const ig = new LR0ItemGraph(g1).refresh();

    expect(ig.size).toBe(12);
    expect(
      ig.itemSets.has(
        From(ig, ["E1", 0, 0], ["E", 0, 0], ["E", 1, 0], ["T", 0, 0], ["T", 1, 0], ["F", 0, 0], ["F", 1, 0]),
      ),
    );
    expect(ig.itemSets.has(From(ig, ["E1", 0, 1], ["E", 0, 1])));
    // Set I2
    expect(ig.itemSets.has(From(ig, ["E", 1, 1], ["T", 0, 1])));
    // Set 3
    expect(ig.itemSets.has(From(ig, ["T", 1, 1])));

    // Set 4
    expect(
      ig.itemSets.has(
        From(ig, ["F", 0, 1], ["E", 0, 0], ["E", 1, 0], ["T", 0, 0], ["T", 1, 0], ["F", 0, 0], ["F", 1, 0]),
      ),
    );

    // Set 5
    expect(ig.itemSets.has(From(ig, ["F", 1, 1])));

    // Set 6
    expect(ig.itemSets.has(From(ig, ["E", 0, 2], ["T", 0, 0], ["T", 1, 0], ["F", 0, 0], ["F", 1, 0])));

    // Set 7
    expect(ig.itemSets.has(From(ig, ["T", 0, 2], ["F", 0, 0], ["F", 1, 0])));

    // Set 8
    expect(ig.itemSets.has(From(ig, ["F", 0, 2], ["E", 0, 1])));

    // Set 9
    expect(ig.itemSets.has(From(ig, ["E", 0, 3], ["T", 0, 1])));

    // Set 10
    expect(ig.itemSets.has(From(ig, ["T", 0, 3])));

    // Set 11
    expect(ig.itemSets.has(From(ig, ["F", 0, 3])));
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
    expect(ig.itemSets.has(From(ig, ["S1", 0, 0], ["S", 0, 0], ["S", 1, 0], ["L", 0, 0], ["L", 1, 0], ["R", 0, 0])));

    // Set 1
    expect(ig.itemSets.has(From(ig, ["S1", 0, 1])));

    // Set I2
    expect(ig.itemSets.has(From(ig, ["S", 0, 1], ["R", 0, 1])));

    // Set 3
    expect(ig.itemSets.has(From(ig, ["S", 1, 1])));

    // Set 4
    expect(ig.itemSets.has(From(ig, ["L", 0, 1], ["R", 0, 0], ["L", 0, 0], ["L", 1, 0])));

    // Set 5
    expect(ig.itemSets.has(From(ig, ["L", 1, 1])));

    // Set 6
    expect(ig.itemSets.has(From(ig, ["S", 0, 2], ["R", 0, 0], ["L", 0, 0], ["L", 1, 0])));

    // Set 7
    expect(ig.itemSets.has(From(ig, ["L", 0, 2])));

    // Set 8
    expect(ig.itemSets.has(From(ig, ["R", 0, 1])));

    // Set 9
    expect(ig.itemSets.has(From(ig, ["S", 0, 3])));
  });
});
