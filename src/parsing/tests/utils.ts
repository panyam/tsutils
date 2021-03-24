import { assert } from "../../utils/misc";
import { StringMap } from "../../types";
import { Str, Grammar } from "../grammar";
import { ParseTable as LLParseTable } from "../ll";
import { LRAction, ParseTable, LRItemGraph } from "../lrbase";
import { FirstSets, NullableSet, FollowSets } from "../sets";

export function Goto(ig: LRItemGraph, newState: number): LRAction {
  return LRAction.Goto(ig.itemSets[newState]);
}

export function Shift(itemGraph: LRItemGraph, newState: number): LRAction {
  return LRAction.Shift(itemGraph.itemSets[newState]);
}

export function Reduce(g: Grammar, nt: string, rule: number): LRAction {
  return LRAction.Reduce(g.getSym(nt)!, rule);
}

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

export function expectPTableActions(
  g: Grammar,
  pt: ParseTable,
  itemGraph: LRItemGraph,
  fromSet: number,
  actions: StringMap<LRAction[]>,
): void {
  const itemSet = itemGraph.itemSets[fromSet];
  for (const label in actions) {
    const sym = label == g.Eof.label ? g.Eof : g.getSym(label);
    assert(sym != null, `Symbol '${label}' not found`);
    const foundActions = pt.getActions(itemSet, sym);
    const expectedActions = actions[label];
    if (foundActions.length != expectedActions.length) {
      console.log("Action Mismatch: ", label, sym);
      expect(foundActions.length).toEqual(expectedActions.length);
    }
    for (let i = 0; i < foundActions.length; i++) {
      if (!foundActions[i].equals(expectedActions[i])) {
        assert(
          false,
          `State ${fromSet} - Action Mismatch for label ${label} at index: ${i}.  Found: ${foundActions[
            i
          ].toString()}, Expected: ${expectedActions[i].toString()}`,
        );
      }
    }
  }
}

export function verifyLLParseTable(
  name: string,
  g: Grammar,
  maker: (g: Grammar) => LLParseTable,
  actions: StringMap<string[]>,
  debug = false,
): boolean {
  const ptable = maker(g);
  const ptabValue = ptable.debugValue as StringMap<string[]>;
  if (debug) console.log(`${name} Actions: `, ptabValue);
  expect(actions).toEqual(ptabValue);
  return true;
}

// Verified using http://jsmachines.sourceforge.net/machines/lr1.html
export function verifyLRParseTable(
  name: string,
  g: Grammar,
  maker: (g: Grammar) => [ParseTable, LRItemGraph],
  actions: StringMap<StringMap<string[]>>,
  debug = false,
): boolean {
  const [ptable, ig] = maker(g);
  const ptabValue = ptable.debugValue as StringMap<StringMap<string[]>>;
  if (debug) console.log(`${name} Actions: `, ptabValue);
  expect(actions).toEqual(ptabValue);
  return true;
}
