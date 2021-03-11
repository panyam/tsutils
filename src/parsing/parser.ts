import { Nullable } from "../types";

export class PTNode<NodeType> {
  readonly type: NodeType;
  parent: Nullable<PTNode<NodeType>> = null;
  value: any;
  protected children: PTNode<NodeType>[];
  constructor(type: NodeType, value: any = null, ...children: PTNode<NodeType>[]) {
    this.children = children || [];
    this.value = value;
    this.type = type;
  }

  add(node: PTNode<NodeType>): void {
    node.parent = this;
    this.children.push(node);
  }
}
