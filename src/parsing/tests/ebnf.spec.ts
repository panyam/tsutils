import { ExpType, Exp, Grammar } from "../grammar";
import { EBNFParser } from "../ebnf";

describe("EBNF Tests", () => {
  test("Test1", () => {
    const g = new EBNFParser(`S : A | B | C ;`).grammar;

    expect(g.nonTerminals.length).toBe(1);
    expect(g.terminals.length).toBe(3);
  });
});
