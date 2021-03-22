import { Nullable } from "../../types";
import { Sym, Grammar } from "../grammar";
import { FirstSets, NullableSet, FollowSets } from "../sets";
import { EBNFParser } from "../ebnf";
import { assert } from "../../utils/misc";
import { PTNode, Tokenizer } from "../parser";
import { Token } from "../tokenizer";
import { expectFSEntries } from "./utils";
import Samples from "./samples";
import { LRItem, LRItemSet, LRItemGraph } from "../lritems";

const g1 = new EBNFParser(`
  E1 -> E ;
  E -> E PLUS T | T ;
  T -> T STAR F | F ;
  F -> OPEN E CLOSE | id ;
`).grammar;

function expectItemSet(g: Grammar, set: LRItemSet, entries: [string, number, number][]) {
  expect(set.size).toBe(entries.length);
  for (const [sym, index, pos] of entries) {
    expect(set.containsRule(g.getSym(sym)!, index, pos)).toBe(true);
  }
}

function newItemSet(g: Grammar, entries: [string, number, number][]) {
  const set = new LRItemSet();
  for (const [sym, index, pos] of entries) {
    set.add(new LRItem(g.getSym(sym)!, index, pos));
  }
  return set;
}

describe("LRItem", () => {
  test("Test Equality", () => {
    const g = g1;
    const set1 = new LRItemSet();
    const E1 = g.getSym("E1")!;
    const l1 = new LRItem(E1);
    expect(l1.key).toEqual(`${E1.id}:0:0`);
    set1.add(l1);
    const l2 = new LRItem(g.getSym("E1")!);
    expect(l1.equals(l2)).toBe(true);
    expect(set1.size).toBe(1);
    set1.add(l2);
    expect(set1.size).toBe(1);
  });

  test("Test Advance", () => {
    const g = g1;
    const set1 = new LRItemSet();
    const E = g.getSym("E")!;
    const l1 = new LRItem(E, 1);
    set1.add(l1);
    expect(l1.position).toEqual(0);
    const l2 = l1.advance();
    expect(l2.nt.equals(l1.nt)).toBe(true);
    expect(l2.ruleIndex).toEqual(l1.ruleIndex);
    expect(l2.position).toEqual(l1.position + 1);

    expect(() => l2.advance()).toThrowError();
  });
});

describe("LRItemSet", () => {
  test("Test Closure", () => {
    const g = g1;
    const set1 = new LRItemSet();
    const E1 = g.getSym("E1")!;
    const l1 = new LRItem(E1);
    set1.add(l1);
    expect(set1.size).toBe(1);
    set1.closure();
    expectItemSet(g, set1, [
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

describe("LRItemGraph", () => {
  test("Test Basic", () => {
    const ig = new LRItemGraph(g1);

    expect(ig.size).toBe(12);
    expect(
      ig.contains(
        newItemSet(g1, [
          ["E1", 0, 0],
          ["E", 0, 0],
          ["E", 1, 0],
          ["T", 0, 0],
          ["T", 1, 0],
          ["F", 0, 0],
          ["F", 1, 0],
        ]),
      ),
    );
    expect(
      ig.contains(
        newItemSet(g1, [
          ["E1", 0, 1],
          ["E", 0, 1],
        ]),
      ),
    );
    // Set I2
    expect(
      ig.contains(
        newItemSet(g1, [
          ["E", 1, 1],
          ["T", 0, 1],
        ]),
      ),
    );
    // Set 3
    expect(ig.contains(newItemSet(g1, [["T", 1, 1]])));

    // Set 4
    expect(
      ig.contains(
        newItemSet(g1, [
          ["F", 0, 1],
          ["E", 0, 0],
          ["E", 1, 0],
          ["T", 0, 0],
          ["T", 1, 0],
          ["F", 0, 0],
          ["F", 1, 0],
        ]),
      ),
    );

    // Set 5
    expect(ig.contains(newItemSet(g1, [["F", 1, 1]])));

    // Set 6
    expect(
      ig.contains(
        newItemSet(g1, [
          ["E", 0, 2],
          ["T", 0, 0],
          ["T", 1, 0],
          ["F", 0, 0],
          ["F", 1, 0],
        ]),
      ),
    );

    // Set 7
    expect(
      ig.contains(
        newItemSet(g1, [
          ["T", 0, 2],
          ["F", 0, 0],
          ["F", 1, 0],
        ]),
      ),
    );

    // Set 8
    expect(
      ig.contains(
        newItemSet(g1, [
          ["F", 0, 2],
          ["E", 0, 1],
        ]),
      ),
    );

    // Set 9
    expect(
      ig.contains(
        newItemSet(g1, [
          ["E", 0, 3],
          ["T", 0, 1],
        ]),
      ),
    );

    // Set 10
    expect(ig.contains(newItemSet(g1, [["T", 0, 3]])));

    // Set 11
    expect(ig.contains(newItemSet(g1, [["F", 0, 3]])));
    // for (let i = 7; i < ig.itemSets.length; i++) { console.log("Set ", i, ": \n", ig.itemSets[i].printed()); }
  });
});
