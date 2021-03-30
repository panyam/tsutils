import { EBNFParser } from "../ebnf";
import { Grammar } from "../grammar";
import { removeUselessSymbols, removeNullProductions } from "../analyzer";

describe("Analyzer Tests", () => {
  test("Useless Symbols Tests", () => {
    const g = new EBNFParser(`
      S -> a b S | a b A | a b B ;
      A -> c d ;
      B -> a B ;
      C -> d c ;
    `).grammar;
    expect(g.reachableSymbols().labels()).toEqual(["S", "A", "B"]);
    expect(g.terminalDerivingSymbols.labels()).toEqual(["a", "b", "c", "d", "A", "C", "S"]);
    removeUselessSymbols(g);
    console.log("NewG: ", g.debugValue());
    expect(g.debugValue()).toEqual(["S -> a b S", "S -> a b A", "A -> c d"]);
  });

  test("Expand Null Production", () => {
    const g = new EBNFParser(`
      S -> A B A C ;
      A -> a A | ;
      B -> b B | ;
      C -> c ;
    `).grammar;
  });

  test("Null Production Removal", () => {
    const g = new EBNFParser(`
      S -> A B A C ;
      A -> a A | ;
      B -> b B | ;
      C -> c ;
    `).grammar;
    expect(g.reachableSymbols().labels()).toEqual(["S", "A", "B", "C"]);
    expect(g.terminalDerivingSymbols.labels()).toEqual(["a", "A", "b", "B", "c", "C", "S"]);
    console.log("TD: ", g.terminalDerivingSymbols.labels());
    console.log("Reachables: ", g.reachableSymbols().labels());
    removeUselessSymbols(g);
    removeNullProductions(g);
    console.log("NewG: ", g.debugValue());
    expect(g.debugValue()).toEqual([
      'S -> A B A C', 'S -> B A C',
      'S -> A C', 'S -> C',
      'S -> B C', 'S -> A A C',
      'S -> A B C', 'A -> a A',
      'A -> a', 'B -> b B',
      'B -> b', 'C -> c'
    ]);
  });
});
