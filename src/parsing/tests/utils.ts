import { Str, Grammar } from "../grammar";
import { assert } from "../../utils/misc";
import { StringMap } from "../../types";
import { FirstSets, NullableSet, FollowSets } from "../sets";

export function listsEqual(l1: string[], l2: string[]): boolean {
  l1 = l1.sort();
  l2 = l2.sort();
  if (l1.length != l2.length) return false;
  for (let i = 0; i < l1.length; i++) {
    if (l2[i] != l1[i]) return false;
  }
  return true;
}

export function expectNullables(nullables: NullableSet, terms: string[]): void {
  const ns = nullables.nonterms.map((n) => n.label).sort();
  if (!listsEqual(ns, terms)) {
    console.log(`Nullables Expected FS[${ns}]: `, terms, ", Found: ", terms);
    assert(false);
  }
}

export function expectFSEntries(g: Grammar, fs: FirstSets | FollowSets, entries: StringMap<string[]>): void {
  for (const nt in entries) {
    const exp = g.getSym(nt);
    assert(exp != null, `Symbol {nt} does not exist`);
    const labels = fs.entriesFor(exp).labels(true).sort();
    const terms = entries[nt].sort();
    if (!listsEqual(labels, terms)) {
      console.log(`Expected FS[${nt}]: `, terms, ", Found: ", labels);
      assert(false);
    }
  }
}

export function expectRules(g: Grammar, nt: string, ...rules: (string | Str)[]): void {
  const nonterm = g.getSym(nt);
  assert(nonterm != null, `Nonterminal {nt} does not exist`);
  expect(nonterm?.rules.length).toBe(rules.length);
  for (let i = 0; i < rules.length; i++) {
    const eq = nonterm?.rules[i].equals(g.normalizeRule(rules[i]));
    if (!eq) {
      console.log("Expected: ", rules[i], "Found: ", nonterm?.rules[i]);
      assert(false, `Rule ${i} does not match`);
    }
  }
}
