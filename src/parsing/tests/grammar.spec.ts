import { NullableSet } from "../sets";
import { EBNFParser } from "../ebnf";
import { Sym, Grammar } from "../grammar";

describe("Grammar Tests", () => {
  test("Constructor", () => {
    const g = new EBNFParser(`
      S : A B | C ;
      A : 0 B | C ;
      B : 1 | A 0 ;
      C : A C | C;
    `).grammar;

    expect(g.terminals.length).toBe(2);
    expect(() => g.newTerm("A")).toThrowError();
    expect(g.getNT("B")?.label).toBe("B");
    const ns = new NullableSet(g).nonterms.map((n) => n.label);
    expect(ns).toEqual([]);
  });

  test("Auxilliary Rules", () => {
    const g = new Grammar();
    const x = g.newAuxNT();
    const A = g.newTerm("a");
    const B = g.newTerm("b");
    const C = g.newTerm("c");
    x.add(g.normalizeExp(A));
    x.add(g.normalizeExp(B));
    x.add(g.normalizeExp(C));

    expect(g.anyof(A, B, C)).toEqual(x);
  });
});
