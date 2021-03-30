import { Nullable, StringMap } from "../types";
import { Str, Sym, Grammar } from "./grammar";

/**
 * Returns symbols that do not derive any terminal strings or symbols
 * that cannot be reached from the Start symbol and a grammar with
 * these symbols removed.
 */
export function removeUselessSymbols(g: Grammar, fromSymbol: Nullable<Sym> = null): void {
  // Remove all symbols not deriving terminals
  const derives_terminal = g.terminalDerivingSymbols;
  // g.removeSymbols((s) => !derives_terminal.has(s));
  g.removeRules(r => !derives_terminal.has(r.nt) || r.rhs.syms.findIndex(s => !s.isTerminal && !derives_terminal.has(s)) >= 0);
  g.refresh();
  const reachable_symbols = g.reachableSymbols(fromSymbol);
  // g.removeSymbols((s) => !s.isTerminal && !reachable_symbols.has(s));
  g.removeRules(r => !reachable_symbols.has(r.nt) || r.rhs.syms.findIndex(s => !s.isTerminal && !reachable_symbols.has(s)) >= 0);
  g.refresh();

  // Remove all non reachable symbols
  // g.removeSymbols((s) => !reachable_symbols.has(s));
}

/**
 * Expands productions that can result in null productions.
 */
export function expandNullProductions(grammar: Grammar, str: Str, results?: StringMap<Str>): StringMap<Str> {
  results = results || {};
  if (str.length > 0) {
    const nullables = grammar.nullables;
    const key = str.toString();
    if (!(key in results)) {
      results[key] = str;
      str.syms.forEach((sym, index) => {
        if (nullables.isNullable(sym)) {
          // then create a new rule without this string in each position
          const newStr = str.copy().splice(index, 1);
          expandNullProductions(grammar, newStr, results);
        }
      });
    }
  }
  return results;
}

/**
 * Removes null productions for either a single non terminal or all non
 * terminals (if nt is null) from the given grammar.
 *
 * A -> ? B C
 *
 * will be replaced with:
 *
 * A -> C
 * A -> B C
 */
export function removeNullProductions(grammar: Grammar, nt: Nullable<Sym> = null): void {
  if (nt == null) {
    grammar.forEachNT((nt) => removeNullProductions(grammar, nt));
  } else {
    const results: StringMap<Str> = {};
    grammar.rulesForNT(nt).forEach((r) => expandNullProductions(grammar, r.rhs, results));
    // Remove all existing rules of nt
    grammar.removeRules((r) => r.nt == nt);
    // and add the new rules
    for (const key in results) {
      grammar.add(nt, results[key]);
    }
    // TODO - Do this for all non terms except the start symbol?
    grammar.removeRules((r) => r.nt == nt && r.rhs.length == 0);
  }
}

export function removeCycles(grammar: Grammar): void {}

export function removeLeftRecursion(grammar: Grammar): void {
  /*
   * Removes direct left recursion for a particular non terminal if any.
   * For the given terminal, A, replaces the productions of the form:
   *
   *    A -> A a1 | A a2 ... | A an | b1 | b2 | b3 ... bm
   *
   * with:
   *
   *    A -> b1 A' | b2 A' | ... bm A'
   *    A' -> a1 A' | a2 A' | ... an A' | epsilon
   */
  /*
        // First check if this NT has left recursive productions
        isLeftRecursive = False
        for prod in self.productionsFor(nonterm):
            if prod.rhs[0].symbol == nonterm:
                isLeftRecursive = True
                break
        if not isLeftRecursive:
            return

        # Add a new nonterminal that will be right recursive
        def default_newnamefunc(ntname):
            count = 1
            newname = nonterm.name + str(count)
            while newname in self.nonTerminalsByName:
                count += 1
                newname = nonterm.name + str(count)
            return newname

        newnamefunc = newnamefunc or default_newnamefunc
        newname = newnamefunc(nonterm.name)
        newnonterm = Symbol(newname, nonterm.resultType)
        self.addNonTerminal(newnonterm)

        prodlist = self.productions[nonterm]
        for index, prod in enumeratex(prodlist, indexed=True, reverse=True):
            if prod.rhs[0].symbol == nonterm:
                # we have a left recursion:
                # A -> A ax
                # So change to:
                # remove rule and add following to A'
                # A' -> ax A'
                prodlist.removeProduction(index)
                prod.rhs.append(SymbolUsage(newnonterm, prod.rhs[0].varname))
                del prod.rhs[0]
                self.addProduction(newnonterm, prod)
            else:
                # We have non left recursive rule:
                # A -> bk
                # Replace rule with:
                # A -> bk A'
                prod.rhs.append(newnonterm)
        # finally add the epsilon production
        self.addProduction(newnonterm, Production(newnonterm, []))
        */
}
