import { Nullable } from "../types";
import { ParseError, UnexpectedTokenError } from "./errors";

type TokenType = number | string;

export class Token {
  tag: TokenType;
  pos: number;
  line: number;
  col: number;
  value?: any;

  constructor(pos: number, line: number, col: number, type: TokenType, value: any = null) {
    this.pos = pos;
    this.line = line;
    this.col = col;
    this.tag = type;
    this.value = value;
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
    return this.line == another.line && this.col == another.col + another.value.length;
  }
}

/**
 * A Tape of characters we would read with some extra helpers like rewinding
 * forwarding and prefix checking that is fed into the different tokenizers
 * used by the scannerless parsers.
 */
export class CharTape {
  lineLengths: number[] = [];
  index = 0;
  currLine = 0;
  currCol = 0;
  input: string;

  constructor(input: string) {
    this.input = input;
  }

  push(content: string): void {
    this.input += content;
  }

  /**
   * Tells if the given prefix is matche at the current position of the tokenizer.
   */
  matches(prefix: string, advance = true): boolean {
    const lastIndex = this.index;
    const lastLine = this.currLine;
    const lastCol = this.currCol;
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
      this.currLine = lastLine;
      this.currCol = lastCol;
    }
    return success;
  }

  get hasMore(): boolean {
    return this.index < this.input.length;
  }

  peekCh(): string {
    if (!this.hasMore) return "";
    return this.input[this.index];
  }

  nextCh(): string {
    if (!this.hasMore) return "";
    const ch = this.input[this.index++];
    this.currCol++;
    if (ch == "\n" || ch == "\r") {
      this.lineLengths[this.currLine] = this.currCol + 1;
      this.currCol = 0;
      this.currLine++;
    }
    return ch;
  }

  rewind(): boolean {
    //
    this.index--;
    if (this.currCol > 0) this.currCol--;
    else {
      this.currLine--;
      this.currCol = this.lineLengths[this.currLine] - 1;
    }
    return true;
  }
}

/**
 * Tokenize our string into multiple Tokens.
 */
export abstract class Tokenizer {
  tape: CharTape;
  private peekedToken: Nullable<Token> = null;

  constructor(tape: string | CharTape) {
    if (typeof tape === "string") {
      tape = new CharTape(tape);
    }
    this.tape = tape;
  }

  peek(): Nullable<Token> {
    return this.next(false);
  }

  /**
   * Performs the real work of extracting the next token from
   * the tape based on the current state of the tokenizer.
   */
  protected abstract extractNext(): Nullable<Token>;

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
    nextAction?: (token: Token) => boolean | undefined,
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
      throw new ParseError(-1, -1, "Unexpected end of input.");
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
