import { Cardinality, Exp, Sym, Str, NonTerm, Grammar } from "./grammar";

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

export function printRules(g: Grammar, rules: Exp[], hideAux = true): string {
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

export function printRule(g: Grammar, rule: Exp, hideAux = true): string {
  let out = "";
  if (!rule.isString) {
    const sym = rule as Sym;
    const lit = sym.value;
    if (lit.isTerminal) {
      out += ` ${lit.label} `;
    } else {
      const nt = lit as NonTerm;
      if (!hideAux || !nt.isAuxiliary) {
        out += ` ${lit.label} `;
      } else {
        out += "( ";
        out += printRules(g, nt.rules, hideAux);
        out += " )";
      }
    }
    if (sym.cardinality == Cardinality.ATMOST_1) {
      out += "?";
    } else if (sym.cardinality == Cardinality.ATLEAST_0) {
      out += "*";
    } else if (sym.cardinality == Cardinality.ATLEAST_1) {
      out += "+";
    }
  } else {
    // Handle strings
    return (rule as Str).syms.map((s) => printRule(g, s, hideAux)).join(" ");
  }
  return out;
}
