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
    x.add(new Sym(A));
    x.add(new Sym(B));
    x.add(new Sym(C));

    const y = g.anyof(new Sym(A), new Sym(B), new Sym(C)) as Sym;
    expect(y.value).toBe(x);
  });
});
