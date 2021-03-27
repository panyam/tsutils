import { Sym, Str, Grammar } from "./grammar";
import { PTNode } from "./parser";
import { NullableSet } from "./sets";
import { allMinimalCycles } from "./graph";

/**
 * Returns all cycles in this grammar.
 */
export function cyclesInGrammar(grammar: Grammar, nullables: NullableSet): any {
  /*
   * Returns the edge of the given nonterm
   * For a nt such that:
   *             S -> alpha1 X1 beta1 |
   *                  alpha2 X2 beta2 |
   *                  ...
   *                  alphaN XN betaN |
   *
   * S's neighbouring nodes would be Xk if all of alphak is optional
   * AND all of betak is optional
   */
  function edgeFunctor(node: Sym): [Sym, any][] {
    const out: [Sym, any][] = [];
    node.rules.forEach((rule, ruleIndex) => {
      rule.syms.forEach((s, j) => {
        if (s.isTerminal) return;
        if (nullables.isStrNullable(rule, 0, j - 1) && nullables.isStrNullable(rule, j + 1)) {
          out.push([s, ruleIndex]);
        }
      });
    });
    return out;
  }
  return allMinimalCycles(grammar.nonTerminals, (val: Sym) => val.id, edgeFunctor);
}

/**
 * Returns a set of "Starting" non terminals which have atleast
 * one production containing left recursion.
 */
export function leftRecursion(grammar: Grammar, nullables: NullableSet): any {
  function edgeFunctor(node: Sym): [Sym, any][] {
    const out: [Sym, any][] = [];
    node.rules.forEach((rule, ruleIndex) => {
      rule.syms.forEach((s, j) => {
        if (s.isTerminal) return;
        out.push([s, ruleIndex]);
        // If this is symbol is not nullable then we can stop here
        return nullables.isNullable(s);
      });
    });
    return out;
  }
  return allMinimalCycles(grammar.nonTerminals, (val: Sym) => val.id, edgeFunctor);
}

export function printGrammar(g: Grammar, hideAux = true): string {
  let out = "";
  g.forEachNT((nt) => {
    if (!hideAux || !nt.isAuxiliary) {
      out += nt.label + " -> ";
      out += printRules(g, nt.rules, hideAux) + "\n\n";
    }
  });
  return out;
}

export function printRules(g: Grammar, rules: Str[], hideAux = true): string {
  // If auxiliaries are hidden then we dont show the rule name
  let out = "";
  const indentStr = "    ";
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (i > 0) {
      if (!hideAux) {
        out += "\n";
        out += indentStr;
      }
      out += " | ";
    }
    out += printRule(g, rule, hideAux);
  }
  if (!hideAux) {
    out += "\n";
    out += indentStr;
  }
  out += " ;";
  return out;
}

export function printRule(g: Grammar, rule: Str, hideAux = true): string {
  return rule.debugString;
}

function printTree(node: PTNode, level = 0): string {
  let out = "";
  let indentStr = "";
  for (let i = 0; i < level; i++) indentStr += "  ";
  out += indentStr + node.sym.label + " - " + node.value;
  for (const child of node.children) out += "\n" + printTree(child, level + 1);
  return out;
}
