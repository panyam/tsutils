import { EBNFParser } from "../ebnf";
import { LRItem, LRItemSet, LRItemGraph } from "../lritems";
import { expectItemSet } from "./utils";

const g1 = new EBNFParser(`
  E -> E PLUS T | T ;
  T -> T STAR F | F ;
  F -> OPEN E CLOSE | id ;
`).grammar;
g1.setAugStart("E1");

describe("LRItem", () => {
  test("Test Equality", () => {
    const g = g1;
    const set1 = new LRItemSet();
    const E1 = g.getSym("E1")!;
    const l1 = new LRItem(E1);
    expect(l1.key()).toEqual(`${E1.id}:0:0`);
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
        LRItemSet.From(g1, [
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
        LRItemSet.From(g1, [
          ["E1", 0, 1],
          ["E", 0, 1],
        ]),
      ),
    );
    // Set I2
    expect(
      ig.contains(
        LRItemSet.From(g1, [
          ["E", 1, 1],
          ["T", 0, 1],
        ]),
      ),
    );
    // Set 3
    expect(ig.contains(LRItemSet.From(g1, [["T", 1, 1]])));

    // Set 4
    expect(
      ig.contains(
        LRItemSet.From(g1, [
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
    expect(ig.contains(LRItemSet.From(g1, [["F", 1, 1]])));

    // Set 6
    expect(
      ig.contains(
        LRItemSet.From(g1, [
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
        LRItemSet.From(g1, [
          ["T", 0, 2],
          ["F", 0, 0],
          ["F", 1, 0],
        ]),
      ),
    );

    // Set 8
    expect(
      ig.contains(
        LRItemSet.From(g1, [
          ["F", 0, 2],
          ["E", 0, 1],
        ]),
      ),
    );

    // Set 9
    expect(
      ig.contains(
        LRItemSet.From(g1, [
          ["E", 0, 3],
          ["T", 0, 1],
        ]),
      ),
    );

    // Set 10
    expect(ig.contains(LRItemSet.From(g1, [["T", 0, 3]])));

    // Set 11
    expect(ig.contains(LRItemSet.From(g1, [["F", 0, 3]])));
  });
});

const g2 = new EBNFParser(`
  S -> L EQ R ;
  S -> R ;
  L -> STAR R ;
  L -> id ;
  R -> L ;
`).grammar;
g2.setAugStart("S1");

describe("LRItemGraph with Conflicts", () => {
  test("Test1", () => {
    const ig = new LRItemGraph(g2);

    expect(ig.size).toBe(10);
    // Set 0
    expect(
      ig.contains(
        LRItemSet.From(g2, [
          ["S1", 0, 0],
          ["S", 0, 0],
          ["S", 1, 0],
          ["L", 0, 0],
          ["L", 1, 0],
          ["R", 0, 0],
        ]),
      ),
    );

    // Set 1
    expect(ig.contains(LRItemSet.From(g2, [["S1", 0, 1]])));

    // Set I2
    expect(
      ig.contains(
        LRItemSet.From(g2, [
          ["S", 0, 1],
          ["R", 0, 1],
        ]),
      ),
    );

    // Set 3
    expect(ig.contains(LRItemSet.From(g2, [["S", 1, 1]])));

    // Set 4
    expect(
      ig.contains(
        LRItemSet.From(g2, [
          ["L", 0, 1],
          ["R", 0, 0],
          ["L", 0, 0],
          ["L", 1, 0],
        ]),
      ),
    );

    // Set 5
    expect(ig.contains(LRItemSet.From(g2, [["L", 1, 1]])));

    // Set 6
    expect(
      ig.contains(
        LRItemSet.From(g2, [
          ["S", 0, 2],
          ["R", 0, 0],
          ["L", 0, 0],
          ["L", 1, 0],
        ]),
      ),
    );

    // Set 7
    expect(ig.contains(LRItemSet.From(g2, [["L", 0, 2]])));

    // Set 8
    expect(ig.contains(LRItemSet.From(g2, [["R", 0, 1]])));

    // Set 9
    expect(ig.contains(LRItemSet.From(g2, [["S", 0, 3]])));
  });
});
