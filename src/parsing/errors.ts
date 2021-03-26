import { Token } from "./tokenizer";
import { Nullable } from "../types";

export class ParseError extends Error {
  index: number;
  readonly name: string = "ParseError";

  constructor(index: number, message: string) {
    super(`Parse Erorr at (${index}): ${message}`);
    this.index = index;
  }
}

export class UnexpectedTokenError extends ParseError {
  foundToken: Nullable<Token>;
  expectedTokens: Token[];
  readonly name: string = "UnexpectedTokenError";

  constructor(foundToken: Nullable<Token>, ...expectedTokens: Token[]) {
    super(
      foundToken?.offset || 0,
      `Found Token: ${foundToken?.tag || "EOF"} (${foundToken?.value || ""}), Expected: ${expectedTokens
        .map((t) => t.tag)
        .join(", ")}`,
    );
    this.foundToken = foundToken;
    this.expectedTokens = expectedTokens;
  }
}
