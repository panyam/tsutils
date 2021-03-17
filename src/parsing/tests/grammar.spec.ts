import { NullableSet } from "../sets";
import { EBNFParser } from "../ebnf";
import { Str, Grammar, Cardinality, multiplyCardinalities as MC } from "../grammar";

describe("Grammar Tests", () => {
  test("Cardinalities", () => {
    const ATLEAST_0 = Cardinality.ATLEAST_0;
    const ATMOST_1 = Cardinality.ATMOST_1;
    const ATLEAST_1 = Cardinality.ATLEAST_1;
    const EXACTLY_1 = Cardinality.EXACTLY_1;
    expect(MC(ATLEAST_0, ATLEAST_0)).toBe(ATLEAST_0);
    expect(MC(ATLEAST_0, ATMOST_1)).toBe(ATLEAST_0);
    expect(MC(ATLEAST_0, ATLEAST_1)).toBe(ATLEAST_0);
    expect(MC(ATLEAST_0, EXACTLY_1)).toBe(ATLEAST_0);

    expect(MC(ATMOST_1, ATLEAST_0)).toBe(ATLEAST_0);
    expect(MC(ATMOST_1, ATMOST_1)).toBe(ATMOST_1);
    expect(MC(ATMOST_1, ATLEAST_1)).toBe(ATLEAST_0);
    expect(MC(ATMOST_1, EXACTLY_1)).toBe(ATMOST_1);

    expect(MC(ATLEAST_1, ATLEAST_0)).toBe(ATLEAST_0);
    expect(MC(ATLEAST_1, ATMOST_1)).toBe(ATLEAST_0);
    expect(MC(ATLEAST_1, ATLEAST_1)).toBe(ATLEAST_1);
    expect(MC(ATLEAST_1, EXACTLY_1)).toBe(ATLEAST_1);

    expect(MC(EXACTLY_1, ATLEAST_0)).toBe(ATLEAST_0);
    expect(MC(EXACTLY_1, ATMOST_1)).toBe(ATMOST_1);
    expect(MC(EXACTLY_1, ATLEAST_1)).toBe(ATLEAST_1);
    expect(MC(EXACTLY_1, EXACTLY_1)).toBe(EXACTLY_1);
  });

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
    x.add(new Str(A));
    x.add(new Str(B));
    x.add(new Str(C));

    const y = g.anyof(new Str(A), new Str(B), new Str(C));
    expect(y.length).toBe(1);
    expect(y.syms[0]).toBe(x);
  });
});
