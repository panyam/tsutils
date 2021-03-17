import { Cardinality, Str, NonTerm, Grammar } from "./grammar";

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
