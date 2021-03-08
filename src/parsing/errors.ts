import { Token } from "./tokenizer";

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

export class UnexpectedTokenError<TokenType> extends ParseError {
  foundToken: Token<TokenType>;
  expectedTokens: Token<TokenType>[];
  readonly name: string = "UnexpectedTokenError";

  constructor(foundToken: Token<TokenType>, ...expectedTokens: Token<TokenType>[]) {
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
