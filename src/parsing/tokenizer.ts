import { Nullable } from "../types";
import { ParseError, UnexpectedTokenError } from "./errors";

type TokenType = number | string;

/**
 * A Tape of characters we would read with some extra helpers like rewinding
 * forwarding and prefix checking that is fed into the different tokenizers
 * used by the scannerless parsers.
 */
export class CharTape {
  lineLengths: number[] = [];
  index = 0;
  input: string;

  constructor(input: string) {
    this.input = input;
  }

  push(content: string): void {
    this.input += content;
  }

  substring(startIndex: number, endIndex: number): string {
    return this.input.substring(startIndex, endIndex);
  }

  /**
   * Advances the tape to the end of the first occurence of the given pattern.
   */
  advanceAfter(pattern: string, ensureNoPrefixSlash = true): number {
    const newPos = this.advanceTill(pattern, ensureNoPrefixSlash);
    if (newPos >= 0) {
      this.index += pattern.length;
    }
    return this.index;
  }

  /**
   * Advances the tape till the start of a given pattern.
   */
  advanceTill(pattern: string, ensureNoPrefixSlash = true): number {
    let lastIndex = this.index;
    while (true) {
      const endIndex = this.input.indexOf(pattern, lastIndex);
      if (endIndex < 0) {
        throw new Error(`Unexpected end of input before (${pattern})`);
      } else if (ensureNoPrefixSlash) {
        let numSlashes = 0;
        for (let i = endIndex - 1; i >= 0; i--) {
          if (this.input[i] == "\\") numSlashes++;
          else break;
        }
        if (numSlashes % 2 == 0) {
          // even number of slashes mean we are fine
          // found a match
          this.index = endIndex;
          return endIndex;
        }
        lastIndex = endIndex + 1;
      } else {
        // found a match
        this.index = endIndex;
        return endIndex;
      }
    }
  }

  /**
   * Tells if the given prefix is matche at the current position of the tokenizer.
   */
  matches(prefix: string, advance = true): boolean {
    const lastIndex = this.index;
    let i = 0;
    let success = true;
    for (; i < prefix.length; i++) {
      if (prefix[i] != this.nextCh()) {
        success = false;
        break;
      }
    }
    // Reset pointers if we are only peeking or match failed
    if (!advance || !success) {
      this.index = lastIndex;
    }
    return success;
  }

  get hasMore(): boolean {
    return this.index < this.input.length;
  }

  get currCh(): string {
    if (!this.hasMore) return "";
    return this.input[this.index];
  }

  nextCh(): string {
    if (!this.hasMore) return "";
    const ch = this.input[this.index++];
    /*
    this.currCol++;
    if (ch == "\n" || ch == "\r") {
      this.lineLengths[this.currLine] = this.currCol + 1;
      this.currCol = 0;
      this.currLine++;
    }
    */
    return ch;
  }

  rewind(): boolean {
    //
    this.index--;
    /*
    if (this.currCol > 0) this.currCol--;
    else {
      this.currLine--;
      this.currCol = this.lineLengths[this.currLine] - 1;
    }
    */
    return true;
  }
}

export class Token {
  readonly tag: TokenType;
  value?: any;
  // Location info
  offset: number;
  length: number;

  constructor(type: TokenType, options: any = null) {
    options = options || {};
    this.tag = type;
    this.value = options.value || 0;
    this.offset = options.offset || 0;
    this.length = options.length || 0;
  }

  isOneOf(...expected: any[]): boolean {
    for (const tok of expected) {
      if (this.tag == tok) {
        return true;
      }
    }
    return false;
  }

  immediatelyFollows(another: Token): boolean {
    return this.offset == another.offset + another.length;
  }
}

export type TokenMatcher = (_: CharTape, pos: number) => Nullable<Token>;

/**
 * Tokenize our string into multiple Tokens.
 */
export class Tokenizer {
  private peekedToken: Nullable<Token> = null;
  tape: CharTape;
  // TODO  - convert literals into a trie
  literals: [string, TokenType][] = [];
  matchers: [TokenMatcher, boolean][] = [];

  constructor(tape: string | CharTape) {
    if (typeof tape === "string") {
      tape = new CharTape(tape);
    }
    this.tape = tape;
  }

  addMatcher(matcher: TokenMatcher, skip = false): this {
    this.matchers.push([matcher, skip]);
    return this;
  }

  addLiteral(lit: string, tokType: TokenType): number {
    const index = this.literals.findIndex((k) => k[0] == lit);
    if (index < 0) {
      this.literals.push([lit, tokType]);
      return this.literals.length - 1;
    } else {
      if (this.literals[index][1] != tokType) {
        throw new Error(`Literal '${lit}' already registered as ${tokType}`);
      }
      return index;
    }
  }

  /**
   * Performs the real work of extracting the next token from
   * the tape based on the current state of the tokenizer.
   * This can be overridden to do any other matchings to be prioritized first.
   * Returns NULL if end of input reached.
   */
  protected extractNext(): Nullable<Token> {
    // go through all literals first
    if (!this.tape.hasMore) return null;
    const pos = this.tape.index;
    // const line = this.tape.currLine;
    // const col = this.tape.currCol;
    for (const [kwd, toktype] of this.literals) {
      if (this.tape.matches(kwd)) {
        return new Token(toktype, {
          offset: pos,
          length: this.tape.index - pos,
          value: kwd,
        });
      }
    }
    for (const [matcher, skip] of this.matchers) {
      const token = matcher(this.tape, pos);
      if (token != null) {
        if (skip) {
          return this.extractNext();
        } else {
          token.offset = pos;
          token.length = this.tape.index - pos;
          return token;
        }
      }
    }
    // Fall through - error char found
    // throw new Error(`Line ${this.tape.currLine}, Col ${this.tape.currCol} - Invalid character: ${this.tape.currCh}`);
    throw new ParseError(
      this.tape.index,
      `Invalid character: ${this.tape.currCh}`
    );
  }

  peek(): Nullable<Token> {
    return this.next(false);
  }

  next(extract = true): Nullable<Token> {
    if (this.peekedToken == null) {
      const next = this.extractNext();
      if (next != null) {
        this.peekedToken = next;
      }
    }
    const out = this.peekedToken;
    // consume it
    if (extract) this.peekedToken = null;
    return out;
  }

  match(
    matchFunc: (token: Token) => boolean,
    ensure = false,
    consume = true,
    nextAction?: (token: Token) => boolean | undefined
  ): Nullable<Token> {
    const token = this.peek();
    if (token != null) {
      if (matchFunc(token)) {
        if (nextAction && nextAction != null) {
          nextAction(token);
        }
        if (consume) {
          this.next();
        }
      } else if (ensure) {
        // Should we throw an error?
        throw new UnexpectedTokenError(token);
      } else {
        return null;
      }
    } else if (ensure) {
      throw new ParseError(-1, "Unexpected end of input.");
    }
    return token;
  }

  consumeIf(...expected: TokenType[]): Nullable<Token> {
    return this.match((t) => t.isOneOf(...expected));
  }

  expectToken(...expected: TokenType[]): Token {
    return this.match((t) => t.isOneOf(...expected), true, true) as Token;
  }

  ensureToken(...expected: TokenType[]): Token {
    return this.match((t) => t.isOneOf(...expected), true, false) as Token;
  }

  nextMatches(...expected: TokenType[]): Nullable<Token> {
    const token = this.peek();
    if (token == null) return null;
    for (const tok of expected) {
      if (token.tag == tok) return token;
    }
    return null;
  }
}
