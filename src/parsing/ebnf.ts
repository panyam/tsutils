import { Nullable, StringMap } from "../types";
import { Token, Tokenizer as TokenizerBase } from "./tokenizer";
import { ParseError, UnexpectedTokenError } from "./errors";
import { Sym, Grammar, Str } from "./grammar";
import { PTNode } from "./parser";
import { assert } from "../utils/misc";

enum TokenType {
  STRING = "STRING",
  NUMBER = "NUMBER",
  IDENT = "IDENT",
  STAR = "STAR",
  PLUS = "PLUS",
  QMARK = "QMARK",
  PIPE = "PIPE",
  OPEN_PAREN = "OPEN_PAREN",
  CLOSE_PAREN = "CLOSE_PAREN",
  OPEN_BRACE = "OPEN_BRACE",
  CLOSE_BRACE = "CLOSE_BRACE",
  OPEN_SQ = "OPEN_SQ",
  CLOSE_SQ = "CLOSE_SQ",
  COMMENT = "COMMENT",
  ARROW = "ARROW",
  SEMI_COLON = "SEMI_COLON",
}

const SingleChTokens = {
  "[": TokenType.OPEN_SQ,
  "]": TokenType.CLOSE_SQ,
  "(": TokenType.OPEN_PAREN,
  ")": TokenType.CLOSE_PAREN,
  "{": TokenType.OPEN_BRACE,
  "}": TokenType.CLOSE_BRACE,
  "*": TokenType.STAR,
  "+": TokenType.PLUS,
  "?": TokenType.QMARK,
  "|": TokenType.PIPE,
  ";": TokenType.SEMI_COLON,
} as StringMap<TokenType>;

const ReservedChars = {
  "#": true,
  "&": true,
  "%": true,
  "@": true,
  ":": true,
  "!": true,
  "*": true,
  "~": true,
  "`": true,
  "'": true,
  ".": true,
  "^": true,
  "|": true,
  "?": true,
  "<": true,
  ">": true,
  $: true,
} as StringMap<boolean>;

const isSpace = (ch: string): boolean => ch.trim() === "";
const isDigit = (ch: string): boolean => ch >= "0" && ch <= "9";
function isIdentChar(ch: string): boolean {
  if (ch in SingleChTokens) return false;
  if (ch in ReservedChars) return false;
  if (isSpace(ch)) return false;
  if (isDigit(ch)) return false;
  return true;
}

export enum NodeType {
  GRAMMAR = "GRAMMAR",
  DECL = "DECL",
  RULE = "RULE",
  PROD_NULL = "PROD_NULL",
  PROD_STR = "PROD_STR",
  PROD_UNION = "PROD_UNION",
  PROD_NAME = "PROD_NAME",
  PROD_STRING = "PROD_STRING",
  PROD_NUM = "PROD_NUM",
  PROD_IDENT = "PROD_IDENT",
  PROD_STAR = "PROD_STAR",
  PROD_PLUS = "PROD_PLUS",
  PROD_OPTIONAL = "PROD_OPTIONAL",
  IDENT = "IDENT",
  ERROR = "ERROR",
  COMMENT = "COMMENT",
}

class Tokenizer extends TokenizerBase {
  extractNext(): Nullable<Token> {
    while (true) {
      // Extract comments first
      const offset = this.tape.index;

      // Comments are also valid tokens
      const comment = this.extractComment();
      if (comment.length > 0) {
        // Skip comments for now
        // return new Token(pos, line, col, TokenType.COMMENT, comment);
        continue;
      }

      if (this.tape.matches("->")) {
        return new Token(TokenType.ARROW, { offset: offset, value: "->" });
      }
      const ch = this.tape.nextCh();
      if (ch == "") return null;

      if (isSpace(ch)) {
        continue;
      } else if (ch == '"' || ch == "'") {
        return this.extractTillEndOfString(offset, ch);
      } else if (ch in SingleChTokens) {
        return new Token(SingleChTokens[ch], { offset: offset, value: ch });
      } else if (isDigit(ch)) {
        let out = ch;
        while (this.tape.hasMore && isDigit(this.tape.currCh)) {
          out += this.tape.nextCh();
        }
        return new Token(TokenType.NUMBER, { offset: offset, value: parseInt(out) });
      } else if (isIdentChar(ch)) {
        // Combination of everything else
        let lit = ch;
        while (this.tape.hasMore) {
          const currCh = this.tape.currCh;
          if (!isIdentChar(currCh) && !isDigit(currCh)) {
            break;
          }
          lit += this.tape.nextCh();
        }
        return new Token(TokenType.IDENT, { offset: offset, value: lit });
      }

      // Fall through - error char found
      throw new Error(`Invalid character at (${offset}): ${ch}`);
    }
    return null;
  }

  extractComment(): string {
    let comment = "";
    if (this.tape.matches("/*")) {
      comment = "/*";
      let depth = 1;
      while (this.tape.hasMore) {
        if (this.tape.matches("*/")) {
          comment += "*/";
          depth--;
          if (depth == 0) {
            break;
          }
        } else if (this.tape.matches("/*")) {
          depth++;
          comment += "/*";
        } else {
          comment += this.tape.nextCh();
        }
      }
    } else if (this.tape.matches("//")) {
      comment = "//";
      // Single line comments
      let ch = this.tape.nextCh();
      while (ch != "" && ch != "\n" && ch != "\r") {
        comment += ch;
        ch = this.tape.nextCh();
      }
    }
    return comment;
  }

  extractTillEndOfString(offset: number, ender = "'"): Token {
    let out = "";
    while (this.tape.hasMore) {
      const currCh = this.tape.nextCh();
      if (currCh == ender) {
        // good
        return new Token(TokenType.STRING, { offset: offset, value: out });
      } else if (currCh == "\\") {
        if (!this.tape.hasMore) {
          break;
        }
        const next = this.tape.nextCh();
        if (next == "n") out += "\n";
        else if (next == "r") out += "\r";
        else if (next == "t") out += "\t";
        else if (next == "\\") out += "\\";
        else if (next == "'") out += "'";
        else if (next == '"') out += '"';
        else out += "\\" + next;
      } else {
        out += currCh;
      }
    }
    throw new ParseError(offset, "Unexpected end of input while reading string");
  }
}

/**
 * EBNF Grammar:
 *
 * grammar := rules;
 *
 * rules := rule | rule rules ;
 *
 * rule := IDENT "->" productions ";" ;
 */
export class EBNFParser {
  readonly grammar: Grammar;
  private tokenizer: Tokenizer;
  constructor(input: string) {
    this.grammar = this.parse(input);
  }

  parse(input: string): Grammar {
    this.tokenizer = new Tokenizer(input);
    return this.parseGrammar();
  }

  /**
   * grammar := decl+;
   *
   * decl := rule ;
   */
  parseGrammar(): Grammar {
    const grammar = new Grammar();
    while (this.tokenizer.peek() != null) {
      this.parseDecl(grammar);
    }
    return grammar;
  }

  parseDecl(grammar: Grammar): void {
    const ident = this.tokenizer.expectToken(TokenType.IDENT);
    if (this.tokenizer.consumeIf(TokenType.ARROW)) {
      let nt = grammar.getSym(ident.value);
      if (nt == null) {
        nt = grammar.newNT(ident.value);
      } else if (nt.isTerminal) {
        // it is a terminal so mark it as a non-term now that we
        // know there is a declaration for it.
        nt.isTerminal = false;
      } else {
        assert(!nt.isAuxiliary, "NT is already auxiliary and cannot be reused.");
      }
      for (const rule of this.parseProductions(grammar, nt)) {
        nt.add(rule);
      }
      this.tokenizer.expectToken(TokenType.SEMI_COLON);
    }
  }

  /*
   * productions := prod  ( | prod ) *
   *            |
   *            ;
   *
   * prod := ( "(" productions ")" | IDENT | STRING ) ( "*" | "+" | "?" ) ?
   *      ;
   */
  parseProductions(grammar: Grammar, nt: Nullable<Sym>): Str[] {
    const out: Str[] = [];
    while (this.tokenizer.peek() != null) {
      const rule = this.parseProd(grammar);
      if (rule) out.push(rule);
      if (this.tokenizer.consumeIf(TokenType.PIPE)) {
        continue;
      } else if (this.tokenizer.nextMatches(TokenType.CLOSE_SQ, TokenType.CLOSE_PAREN, TokenType.SEMI_COLON)) {
        break;
      }
    }
    return out;
  }

  parseProd(grammar: Grammar): Str {
    const out = new Str();
    while (true) {
      // if we are starting with a FOLLOW symbol then return as it marks
      // the end of this production
      if (this.tokenizer.nextMatches(TokenType.CLOSE_PAREN, TokenType.CLOSE_SQ, TokenType.SEMI_COLON, TokenType.PIPE)) {
        return out;
      }
      let curr: Nullable<Str> = null;
      if (this.tokenizer.consumeIf(TokenType.OPEN_PAREN)) {
        const rules = this.parseProductions(grammar, null);
        if (rules.length == 0) {
          // nothing
        } else if (rules.length == 1) {
          curr = rules[0];
        } else {
          // create a new NT over this
          curr = grammar.anyof(...rules);
        }
        this.tokenizer.expectToken(TokenType.CLOSE_PAREN);
      } else if (this.tokenizer.consumeIf(TokenType.OPEN_SQ)) {
        const rules = this.parseProductions(grammar, null);
        if (rules.length == 0) {
          // nothing
        } else if (rules.length == 1) {
          curr = grammar.opt(rules[0]);
        } else {
          // create a new NT over this
          curr = grammar.opt(grammar.anyof(...rules));
        }
        this.tokenizer.expectToken(TokenType.CLOSE_SQ);
      } else if (this.tokenizer.nextMatches(TokenType.IDENT)) {
        const token = this.tokenizer.next() as Token;
        curr = new Str(grammar.getSym(token.value) || grammar.newTerm(token.value));
      } else if (this.tokenizer.nextMatches(TokenType.STRING)) {
        const token = this.tokenizer.next() as Token;
        const label = '"' + token.value + '"';
        // TODO - ensure we can add literal into our
        // Tokenizer so it will prioritize this over its rules
        curr = new Str(grammar.getSym(label) || grammar.newTerm(label));
      } else if (this.tokenizer.nextMatches(TokenType.NUMBER)) {
        const token = this.tokenizer.next() as Token;
        const label = token.value + "";
        // TODO - ensure we can add literal into our
        // Tokenizer so it will prioritize this over its rules
        curr = new Str(grammar.getSym(label) || grammar.newTerm(label));
      } else {
        throw new UnexpectedTokenError(this.tokenizer.peek());
      }

      assert(curr != null);

      if (this.tokenizer.consumeIf(TokenType.STAR)) {
        curr = grammar.atleast0(curr);
      } else if (this.tokenizer.consumeIf(TokenType.PLUS)) {
        curr = grammar.atleast1(curr);
      } else if (this.tokenizer.consumeIf(TokenType.QMARK)) {
        curr = grammar.opt(curr);
      }
      out.extend(curr);
    }
    return out;
  }
}
