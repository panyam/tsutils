import { StringMap } from "../types";
import { Token } from "./tokenizer";

enum RuleType {
  TERM,
  NON_TERM,
  ATLEAST_1,
  ATLEAST_0,
  ANY_OF,
  OPTIONAL,
  SEQ,
}

export abstract class Exp {
  abstract readonly type: RuleType;
}

export class Term extends Exp {
  readonly type: RuleType = RuleType.TERM;
}

export class NonTerm extends Exp {
  readonly type: RuleType = RuleType.NON_TERM;
  label: string;
  constructor(label: string) {
    super();
    this.label = label;
  }
}

export class ExpList extends Exp {
  readonly type: RuleType;
  exps: Exp[];

  constructor(...exps: Exp[]) {
    super();
    this.exps = exps;
  }
}

export class Opt extends Exp {
  readonly type: RuleType = RuleType.OPTIONAL;
  readonly exp: Exp;
  constructor(exp: Exp) {
    super();
    this.exp = exp;
  }
}

export class Seq extends ExpList {
  readonly type: RuleType = RuleType.SEQ;
}

export class AnyOf extends ExpList {
  readonly type: RuleType = RuleType.ANY_OF;
}

export class Atleast1 extends ExpList {
  readonly type: RuleType = RuleType.ATLEAST_1;
}

export class Atleast0 extends ExpList {
  readonly type: RuleType = RuleType.ATLEAST_0;
}

/**
 * A rule for a particular non terminal.
 */
class Rule {
  readonly name: string;
  exps: Exp[];

  constructor(name: string, ...exps: Exp[]) {
    this.name = name;
    this.exps = exps;
  }
}

export class Grammar {
  protected ruleNames: string[] = [];
  protected nontermIndexes: StringMap<number> = {};
  protected rulesByNonTerm: StringMap<Rule> = {};

  addRule(name: string, exp: Exp): Rule {
    if (!(name in this.nontermIndexes)) {
      this.nontermIndexes[name] = this.ruleNames.length;
      this.ruleNames.push(name);
      this.rulesByNonTerm[name] = new Rule(name);
    }
    const rule = this.rulesByNonTerm[name];
    rule.exps.push(exp);
    return rule;
  }

  get ruleCount(): number {
    return this.ruleNames.length;
  }
}
