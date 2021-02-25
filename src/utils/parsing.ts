export class Token {
  pos: number;
  line: number;
  col: number;
  type: any;
  value?: any;

  constructor(pos: number, line: number, col: number, type: any, value: any = null) {
    this.pos = pos;
    this.line = line;
    this.col = col;
    this.type = type;
    this.value = value;
  }

  isOneOf(...expected: any[]): boolean {
    for (const tok of expected) {
      if (this.type == tok) {
        return true;
      }
    }
    return false;
  }
}

export class ParseError extends Error {
  line: number;
  col: number;
  readonly name: string = "ParseError";

  constructor(line: number, col: number, message: string) {
    super(message);
    this.line = line;
    this.col = col;
  }
}

export class UnexpectedTokenError extends ParseError {
  foundToken: Token;
  expectedTokens: Token[];
  readonly name: string = "UnexpectedTokenError";

  constructor(foundToken: Token, ...expectedTokens: Token[]) {
    super(
      foundToken.line,
      foundToken.col,
      `Found Token: ${foundToken.type} (${foundToken.value || ""}), Expected: ${expectedTokens
        .map((t) => t.type)
        .join(", ")}`,
    );
    this.foundToken = foundToken;
    this.expectedTokens = expectedTokens;
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
