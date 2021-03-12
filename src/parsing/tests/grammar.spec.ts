import { ExpType, Exp, Grammar } from "../grammar";
import { FirstSets, NullableSet, FollowSets } from "../sets";
import { streamDict, mapStream, filterStream, collectStream } from "../../utils/streams";

describe("Grammar Tests", () => {
  test("Constructor", () => {
    const g = new Grammar();
    g.addTerminals("0", "1");
    g.add("S", g.seq("A", "B"), "C");
    g.add("A", g.seq("0", "B"), "C");
    g.add("B", "1", g.seq("A", "0"));
    g.add("C", g.seq("A", "C"), "C");

    expect(g.terminals.length).toBe(2);
    expect(() => g.term("A")).toThrowError();
    expect(g.nonterm("B").label).toBe("B");
    const ns = new NullableSet(g).nonterms.map((n) => n.label);
    expect(ns).toEqual([]);
  });

  test("Nullables Tests 1", () => {
    const g = new Grammar();
    g.addTerminals("a", "b", "c");
    g.add("S", g.seq("A", "C", "A"));
    g.add("A", g.seq("a", "A", "a"), "B", "C");
    g.add("B", g.seq("b", "B"), "b");
    g.add("C", g.seq("c", "C"), g.Null);

    const ns = new NullableSet(g).nonterms.map((n) => n.label).sort();
    expect(ns).toEqual(["A", "C", "S"]);
  });

  test("Nullables Tests 2", () => {
    const g = new Grammar();
    g.addTerminals("a", "b", "c");
    g.addS("S", "A", "C", "A")
      .addS("S", "C", "A")
      .addS("S", "A", "A")
      .addS("S", "A", "C")
      .addS("S", "A")
      .addS("S", "C")
      .addS("S");

    g.addS("A", "a", "A", "a");
    g.addS("A", "a", "a");
    g.addS("A", "B");
    g.addS("A", "C");

    g.addS("B", "b", "B");
    g.addS("B", "b");

    g.addS("C", "c", "C");
    g.addS("C", "c");

    const ns = new NullableSet(g).nonterms.map((n) => n.label).sort();
    expect(ns).toEqual(["S"]);
  });

  test("Nullables Tests 3", () => {
    const g = new Grammar();
    g.addTerminals("a", "b", "c");
    g.addS("S", "A", "B", "C");
    g.addS("A", "a", "A");
    g.addS("A");

    g.addS("B", "b", "B");
    g.addS("B");

    g.addS("C", "c", "C");
    g.addS("C");

    const ns = new NullableSet(g).nonterms.map((n) => n.label).sort();
    expect(ns).toEqual(["A", "B", "C", "S"]);
  });

  test("Nullables Tests 4", () => {
    const g = new Grammar();
    g.addTerminals("a", "b", "c");
    g.addS("S", "A", "C", "A")
      .addS("S", "C", "A")
      .addS("S", "A", "A")
      .addS("S", "A", "C")
      .addS("S", "A")
      .addS("S", "C")
      .addS("S");

    g.addS("A", "a", "A");
    g.addS("A", "a");

    g.addS("B", "b", "B");
    g.addS("B", "b");

    g.addS("C", "c", "C");
    g.addS("C", "c");

    const ns = new NullableSet(g).nonterms.map((n) => n.label).sort();
    expect(ns).toEqual(["S"]);
  });

  test("First Tests 1", () => {
    const g = new Grammar();
    g.addTerminals("a", "b", "c");
    g.withNT("S").addR("A", "C", "A");
    g.withNT("A").addR("a", "A", "a").addR("B").addR("C");
    g.withNT("B").addR("a", "B").addR("b");
    g.withNT("C").addR("c", "C").addR();

    const ns = new NullableSet(g);
    const fs = new FirstSets(g, ns);
    const nts = fs.nonterms;
    /*
    streamDict(fs.entries)
                .filter((k: number, v: TermSet) => {
                  const e = g.expById(k);
                  return e != null && e.type == ExpType.NON_TERM;
                })
                .collect(((k: number, v: TermSet), out => out[k] = v), {});
               */
    console.log(fs.entries);
  });
});
