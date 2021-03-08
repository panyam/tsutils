import { Nullable } from "../types";
import { Token } from "./tokenizer";

export type PTNode<TokenType> = PTLeafNode<TokenType> | PTNodeList<TokenType>;

class PTNodeBase<TokenType> {
  parent: Nullable<PTNode<TokenType>> = null;
  isError = false;
  label: string;
  constructor(label: string, parent: Nullable<PTNode<TokenType>>) {
    this.label = label;
    this.parent = parent;
  }
}

export class PTLeafNode<TokenType> {
  token: Token<TokenType>;
}

export class PTNodeList<TokenType> extends PTNodeBase<TokenType> {
  children: PTNode<TokenType>[];
  constructor(label: string, parent: Nullable<PTNode<TokenType>>, ...children: PTNode<TokenType>[]) {
    super(label, parent);
    this.children = children;
  }
}
