import { Str, Term, NonTerm, Exp, Grammar } from "../grammar";
import { EBNFParser } from "../ebnf";
import { assert } from "../../utils/misc";

function symLabels(s: readonly (Term | NonTerm)[], skipAux = true): string[] {
  return s.filter((l) => !skipAux || !l.isAuxiliary).map((x: Term | NonTerm) => x.label);
}

function expectListsEqual(l1: string[], l2: string[]): void {
  l1 = l1.sort();
  l2 = l2.sort();
  expect(l1).toEqual(l2);
}

function expectRules(g: Grammar, nt: string, ...rules: (string | Exp)[]) {
  const nonterm = g.getNT(nt);
  expect(nonterm?.rules.length).toBe(rules.length);
  for (let i = 0; i < rules.length; i++) {
    const eq = nonterm?.rules[i].equals(g.normalizeExp(rules[i]));
    if (!eq) {
      console.log("Expected: ", rules[i], "Found: ", nonterm?.rules[i]);
      assert(false, `Rule ${i} does not match`);
    }
  }
}

describe("EBNF Tests", () => {
  test("Test1", () => {
    const g = new EBNFParser(`S : A | B | C ;`).grammar;
    // console.log("G.nonTerminals: ", g.nonTerminals);

    expect(g.nonTerminals.length).toBe(1);
    expect(g.terminals.length).toBe(3);
  });

  test("Test1", () => {
    const g = new EBNFParser(`
      S : A B | C ;
      A : 0 B | C  ;
      B : 1 | A 0 ;
      C : A C | C ;
      D : "d" ;
    `).grammar;

    expectListsEqual(symLabels(g.nonTerminals), ["S", "A", "B", "C", "D"]);
    expectListsEqual(symLabels(g.terminals), ["0", "1", '"d"']);
    expectRules(g, "S", g.seq("A", "B"), "C");
    expectRules(g, "A", g.seq("0", "B"), "C");
    expectRules(g, "B", "1", g.seq("A", "0"));
    expectRules(g, "C", g.seq("A", "C"), "C");
    expectRules(g, "D", '"d"');
  });

  test("Test2", () => {
    const g = new EBNFParser(`
      Expr : Term ( "+" | "-" ) Expr ;
      Term : Factor ( DIV | MULT ) Term ;
      Factor : NUM | "(" Expr ")" ;
      X : A B C D Z 1 2 3;
      Y : A ? [ B C D ]  [ X | Y | Z ] * [ 1 2 3 ] + ;
    `).grammar;

    expectListsEqual(symLabels(g.nonTerminals), ["Y", "Expr", "Term", "Factor", "X"]);
    expectListsEqual(symLabels(g.terminals), [
      "1",
      "2",
      "3",
      '"+"',
      "Z",
      '"-"',
      "A",
      "B",
      "C",
      "D",
      "DIV",
      "MULT",
      '"("',
      '")"',
      "NUM",
    ]);
    expectRules(g, "Expr", g.seq("Term", g.anyof('"+"', '"-"'), "Expr"));
    expectRules(g, "Term", g.seq("Factor", g.anyof("DIV", "MULT"), "Term"));
    expectRules(g, "X", g.seq("A", "B", "C", "D", "Z", "1", "2", "3"));
    expectRules(g, "Factor", "NUM", g.seq('"("', "Expr", '")"'));
    expectRules(
      g,
      "Y",
      g.seq(
        g.opt("A"),
        g.opt(g.seq("B", "C", "D")),
        g.atleast0(g.opt(g.anyof("X", "Y", "Z"))),
        g.atleast1(g.opt(g.seq("1", "2", "3"))),
      ),
    );
  });

  test("Test3", () => {
    const g = new EBNFParser(`
      X: A | B | ;
      Y: B | ;
    `).grammar;

    expectListsEqual(symLabels(g.nonTerminals), ["X", "Y"]);
    expectListsEqual(symLabels(g.terminals), ["A", "B"]);
    expectRules(g, "X", "A", "B", new Str());
  });
});
