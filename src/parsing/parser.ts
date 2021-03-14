import { Nullable } from "../types";
import { Token, Tokenizer } from "./tokenizer";
import { Grammar } from "./grammar";

type NodeType = number | string;

export class PTNode {
  readonly tag: NodeType;
  parent: Nullable<PTNode> = null;
  token: Nullable<Token> = null;
  readonly _children: PTNode[];
  constructor(tag: NodeType, token: Nullable<Token>) {
    this._children = [];
    this.tag = tag;
    this.token = token;
  }

  get isToken(): boolean {
    return this.token != null;
  }

  get children(): ReadonlyArray<PTNode> {
    return this._children;
  }

  add(node: PTNode): void {
    if (this.isToken) {
      throw new Error("Cannot add _children to a token node");
    }
    node.parent = this;
    this._children.push(node);
  }
}

export abstract class Parser {
  tokenizer: Tokenizer;
  grammar: Grammar;
  constructor(grammar: Grammar, tokenizer: Tokenizer) {
    this.tokenizer = tokenizer;
    this.grammar = grammar;
  }

  abstract parse(): Nullable<PTNode>;
}
