import { Nullable, StringMap } from "../types";
import { Token, Tokenizer as TokenizerBase } from "./tokenizer";
import { ParseError, UnexpectedTokenError } from "./errors";
import { NonTerm, Grammar, Str } from "./grammar";
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
  COLON = "COLON",
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
  ":": TokenType.COLON,
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

function newNode(type: NodeType, value: any = null): PTNode {
  return new PTNode(type, value);
}

class Tokenizer extends TokenizerBase {
  extractNext(): Nullable<Token> {
    while (true) {
      // Extract comments first
      const pos = this.tape.index;
      const line = this.tape.currLine;
      const col = this.tape.currCol;

      // Comments are also valid tokens
      const comment = this.extractComment();
      if (comment.length > 0) {
        // Skip comments for now
        // return new Token(pos, line, col, TokenType.COMMENT, comment);
        continue;
      }

      const ch = this.tape.nextCh();
      if (ch == "") return null;

      if (isSpace(ch)) {
        continue;
      } else if (ch == '"' || ch == "'") {
        return this.extractTillEndOfString(pos, line, col, ch);
      } else if (ch in SingleChTokens) {
        return new Token(pos, line, col, SingleChTokens[ch]);
      } else if (isDigit(ch)) {
        let out = ch;
        while (this.tape.hasMore && isDigit(this.tape.peekCh())) {
          out += this.tape.nextCh();
        }
        return new Token(pos, line, col, TokenType.NUMBER, parseInt(out));
      } else if (isIdentChar(ch)) {
        // Combination of everything else
        let lit = ch;
        while (this.tape.hasMore) {
          const currCh = this.tape.peekCh();
          if (!isIdentChar(currCh) && !isDigit(currCh)) {
            break;
          }
          lit += this.tape.nextCh();
        }
        return new Token(pos, line, col, TokenType.IDENT, lit);
      }

      // Fall through - error char found
      throw new Error(`Line ${this.tape.currLine}, Col ${this.tape.currCol} - Invalid character: ${ch}`);
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

  extractTillEndOfString(pos: number, line: number, col: number, ender = "'"): Token {
    let out = "";
    while (this.tape.hasMore) {
      const currCh = this.tape.nextCh();
      if (currCh == ender) {
        // good
        return new Token(pos, line, col, TokenType.STRING, out);
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
    throw new ParseError(line, col, "Unexpected end of input while reading string");
  }
}

/**
 * EBNF Grammar:
 *
 * grammar := rules;
 *
 * rules := rule | rule rules ;
 *
 * rule := IDENT ":" productions ";" ;
 */
export class EBNFParser {
  readonly grammar: Grammar;
  private tokenizer: Tokenizer;
  constructor(input: string) {
    this.grammar = this.parse(input);
  }

  parse(input: string): Grammar {
    this.tokenizer = new Tokenizer(input);
    const root = this.parseGrammar();
    return this.processParseTree(root);
  }

  /**
   * grammar := decl+;
   *
   * decl := rule ;
   */
  parseGrammar(): PTNode {
    const parent = newNode(NodeType.GRAMMAR);
    while (this.tokenizer.peek() != null) {
      const decl = this.parseDecl();
      if (decl != null) {
        parent.add(decl);
      }
    }
    return parent;
  }

  parseDecl(): Nullable<PTNode> {
    const ident = this.tokenizer.expectToken(TokenType.IDENT);
    if (this.tokenizer.consumeIf(TokenType.COLON)) {
      const out = newNode(NodeType.RULE);
      out.add(newNode(NodeType.PROD_NAME, ident));
      const prod = this.parseProductions();
      out.add(prod);
      this.tokenizer.expectToken(TokenType.SEMI_COLON);
      return out;
    }
    return null;
  }

  /*
   * productions := prod  ( | prod ) *
   *            |
   *            ;
   *
   * prod := ( "(" productions ")" | IDENT | STRING ) ( "*" | "+" | "?" ) ?
   *      ;
   */
  parseProductions(): PTNode {
    const out = newNode(NodeType.PROD_UNION);
    while (this.tokenizer.peek() != null) {
      const curr = this.parseProd();
      out.add(curr);
      if (this.tokenizer.consumeIf(TokenType.PIPE)) {
        continue;
      } else if (this.tokenizer.nextMatches(TokenType.CLOSE_SQ, TokenType.CLOSE_PAREN, TokenType.SEMI_COLON)) {
        break;
      }
    }
    return out;
  }

  parseProd(): PTNode {
    const out = newNode(NodeType.PROD_STR);
    while (true) {
      // if we are starting with a FOLLOW symbol then return as it marks
      // the end of this production
      if (this.tokenizer.nextMatches(TokenType.CLOSE_PAREN, TokenType.CLOSE_SQ, TokenType.SEMI_COLON, TokenType.PIPE)) {
        return out;
      }
      let curr: Nullable<PTNode> = null;
      if (this.tokenizer.consumeIf(TokenType.OPEN_PAREN)) {
        const child = this.parseProductions();
        if (child != null) {
          curr = child;
        }
        this.tokenizer.expectToken(TokenType.CLOSE_PAREN);
      } else if (this.tokenizer.consumeIf(TokenType.OPEN_SQ)) {
        const child = this.parseProductions();
        if (child != null) {
          curr = newNode(NodeType.PROD_OPTIONAL);
          curr.add(child);
        }
        this.tokenizer.expectToken(TokenType.CLOSE_SQ);
      } else if (this.tokenizer.nextMatches(TokenType.IDENT)) {
        curr = newNode(NodeType.PROD_IDENT, this.tokenizer.next()!);
      } else if (this.tokenizer.nextMatches(TokenType.STRING)) {
        curr = newNode(NodeType.PROD_STRING, this.tokenizer.next()!);
      } else if (this.tokenizer.nextMatches(TokenType.NUMBER)) {
        curr = newNode(NodeType.PROD_NUM, this.tokenizer.next()!);
      } else {
        throw new UnexpectedTokenError(this.tokenizer.peek());
      }

      assert(curr != null);

      let postNode: Nullable<PTNode> = null;
      if (this.tokenizer.consumeIf(TokenType.STAR)) {
        postNode = newNode(NodeType.PROD_STAR);
      } else if (this.tokenizer.consumeIf(TokenType.PLUS)) {
        postNode = newNode(NodeType.PROD_PLUS);
      } else if (this.tokenizer.consumeIf(TokenType.QMARK)) {
        postNode = newNode(NodeType.PROD_OPTIONAL);
      }
      if (postNode != null) {
        postNode.add(curr);
        curr = postNode;
      }
      out.add(curr);
    }
    return out;
  }

  processParseTree(pt: PTNode): Grammar {
    const grammar = new Grammar();
    assert(pt.tag == NodeType.GRAMMAR);
    // extract all non terminals
    for (const child of pt.children) {
      assert(child.tag == NodeType.RULE);
      assert(child.children.length == 2);
      assert(child.children[0].isToken);
      assert(child.children[0].tag == NodeType.PROD_NAME);
      assert(child.children[1].tag == NodeType.PROD_UNION);
      grammar.newNT(child.children[0].token!.value);
    }

    // now recurse down and get all terminals and create rules
    for (const child of pt.children) {
      const ntname = child.children[0].token!.value;
      const prods = child.children[1];
      const nt = grammar.getNT(ntname)!;
      this.processProdUnion(grammar, prods, nt);
    }
    return grammar;
  }

  processProdUnion(grammar: Grammar, prods: PTNode, nonterm: Nullable<NonTerm> = null): NonTerm {
    assert(prods.tag == NodeType.PROD_UNION);
    if (nonterm == null) {
      nonterm = grammar.newAuxNT();
    }
    const children = prods.children;
    for (const prod of children) {
      assert(prod.tag == NodeType.PROD_STR);
      const e = this.processProdSeq(grammar, prod);
      if (e != null) {
        nonterm.add(e);
      }
    }
    return nonterm;
  }

  processProdSeq(grammar: Grammar, prods: PTNode): Nullable<Str> {
    assert(prods.tag == NodeType.PROD_STR);
    const children = prods.children;
    const strs: Str[] = [];
    for (const prod of children) {
      const str: Nullable<Str> = this.processProd(grammar, prod);
      if (str != null) {
        strs.push(str);
      }
    }
    if (strs.length == 1) return strs[0];
    else return grammar.seq(...strs);
  }

  processProd(grammar: Grammar, prod: PTNode): Nullable<Str> {
    if (prod.tag == NodeType.PROD_STR) {
      return this.processProdSeq(grammar, prod);
    } else if (prod.tag == NodeType.PROD_UNION) {
      return new Str(this.processProdUnion(grammar, prod));
    } else if (prod.tag == NodeType.PROD_OPTIONAL) {
      assert(prod.children.length == 1);
      const exp = this.processProd(grammar, prod.children[0]);
      if (exp != null) {
        return grammar.opt(exp);
      }
      return exp;
    } else if (prod.tag == NodeType.PROD_PLUS) {
      assert(prod.children.length == 1);
      const exp = this.processProd(grammar, prod.children[0]);
      if (exp != null) {
        return grammar.atleast1(exp);
      }
      return exp;
    } else if (prod.tag == NodeType.PROD_STAR) {
      assert(prod.children.length == 1);
      const exp = this.processProd(grammar, prod.children[0]);
      if (exp != null) {
        return grammar.atleast0(exp);
      }
      return exp;
    } else if (prod.tag == NodeType.PROD_IDENT) {
      const token = prod.token!;
      if (grammar.isNT(token.value)) {
        return new Str(grammar.getNT(token.value)!);
      } else {
        // we have a terminal
        return new Str(grammar.getTerm(token.value, true)!);
      }
    } else if (prod.tag == NodeType.PROD_STRING) {
      // TODO - ensure we can add literal into our
      // Tokenizer so it will prioritize this over its rules
      return new Str(grammar.getTerm('"' + prod.token!.value + '"', true)!);
    } else if (prod.tag == NodeType.PROD_NUM) {
      // TODO - ensure we can add literal into our
      // Tokenizer so it will prioritize this over its rules
      return new Str(grammar.getTerm(prod.token!.value + "", true)!);
    } else if (prod.tag == NodeType.PROD_NULL) {
      return null;
    } else {
      throw new Error("Invalid Prod: " + prod.tag);
    }
    return null;
  }
}
