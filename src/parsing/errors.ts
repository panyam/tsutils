import { Token } from "./tokenizer";
import { Nullable } from "../types";

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
  foundToken: Nullable<Token>;
  expectedTokens: Token[];
  readonly name: string = "UnexpectedTokenError";

  constructor(foundToken: Nullable<Token>, ...expectedTokens: Token[]) {
    super(
      foundToken?.line || -1,
      foundToken?.col || -1,
      `Found Token: ${foundToken?.tag || "EOF"} (${foundToken?.value || ""}), Expected: ${expectedTokens
        .map((t) => t.tag)
        .join(", ")}`,
    );
    this.foundToken = foundToken;
    this.expectedTokens = expectedTokens;
  }
}
