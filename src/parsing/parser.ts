import { Nullable } from "../types";
import { Token } from "./tokenizer";

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
