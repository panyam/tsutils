import { Undefined } from "../types";

declare const $: any;
const fontMetrics: { [key: string]: any } = {};

export function getFontMetrics(fontFamily: string, fontSize: number): any {
  if (!(fontFamily in fontMetrics)) {
    fontMetrics[fontFamily] = {};
  }
  const familyMetrics = fontMetrics[fontFamily];
  if (!(fontSize in familyMetrics)) {
    const a = $("<div style='position:absolute;top:0;left:0'>M</div>");
    a.css("font-family", fontFamily);
    a.css("font-size", fontSize);
    $($(document)[0].body).append(a);
    familyMetrics[fontSize] = {
      height: a[0].offsetHeight,
      size: fontSize,
    };
    a.remove();
  }
  return familyMetrics[fontSize];
}

export function forEachChild(elem: Element, visitor: (child: Element, index: number) => Undefined<boolean>) {
  const children = elem.children;
  const L = children.length;
  for (let i = 0; i < L; i++) {
    const child = children[i];
    if (visitor(child, i) == false) return false;
  }
}

export function forEachNode(elem: Element, visitor: (child: ChildNode, index: number) => Undefined<boolean>) {
  const children = elem.childNodes;
  const L = children.length;
  for (let i = 0; i < L; i++) {
    const child = children[i];
    if (visitor(child, i) == false) return;
  }
}

export function forEachAttribute(elem: Element, visitor: (name: string, value: any) => Undefined<boolean>) {
  const nodeNameMap = elem.attributes;
  for (let i = 0; i < nodeNameMap.length; i++) {
    const attrib = nodeNameMap[i];
    if (visitor(attrib.name, attrib.value) == false) return;
  }
}

/**
 * Processing of different kinds of attributes.
 */
export function parseCSSStyles(value: string) {
  const out: any = {};
  if (value && value != null) {
    const values = value.split(";");
    values.forEach(function (elem) {
      if (elem.trim().length > 0) {
        const kvpair = elem.split(":");
        if (kvpair.length >= 2) {
          const key = kvpair[0].trim();
          const value = kvpair[1].trim();
          if (key.length > 0) {
            out[key] = value;
          }
        }
      }
    });
  }
  return out;
}

export function getAttr(elem: Element, attrib: string, ...validators: any) {
  let value = elem.getAttribute(attrib);
  for (let i = 0; i < validators.length; i++) {
    value = validators[i](value);
  }
  return value;
}

export function ensureAttr(elem: Element, attrib: string) {
  const value = elem.getAttribute(attrib) || null;
  if (value == null) {
    throw new Error(`Element MUST have Attribute: ${attrib}`);
  }
  return value;
}

export function setAttr(elem: Element, name: string, value: any) {
  return elem.setAttribute(name, value);
}

export function getAttrOrStyle(elem: Element, attribName: string, cssStyles: any, styleName: string) {
  return elem.getAttribute(attribName) || cssStyles[styleName];
}

export function createSVGNode<T extends SVGGraphicsElement>(nodename: string, config: any): any {
  config = config || {};
  config.ns = "http://www.w3.org/2000/svg";
  return createNode(nodename, config) as T;
}

export function createNode(nodename: string, config?: any): Element {
  let out;
  config = config || {};
  const ns = config.ns;
  const doc = config.doc || document;
  const attrs = config.attrs || {};
  const text = config.text || "";
  const parent = config.parent || null;
  if (ns) out = doc.createElementNS(ns, nodename);
  else out = doc.createElement(nodename);
  if (parent != null) {
    parent.appendChild(out);
  }
  for (const attr in attrs || {}) {
    const value = attrs[attr];
    out.setAttribute(attr, value);
  }
  if (text) {
    out.textContent = text;
  }
  return out;
}

/**
 * Remove a node from its parent.
 */
export function removeNode(node: Node): void {
  node.parentNode?.removeChild(node);
}

export function insertAfter(node: Node, ...newNodes: Node[]): boolean {
  const parentNode = node.parentNode;
  if (parentNode == null) return false;
  const nextNode = node.nextSibling;
  if (nextNode == null) {
    for (let i = 0; i < newNodes.length; i++) {
      parentNode.appendChild(newNodes[i]);
    }
  } else {
    for (let i = 0; i < newNodes.length; i++) {
      parentNode.insertBefore(newNodes[i], nextNode);
    }
  }
  return true;
}

export function getCSS(elem: Element, attr: string): any {
  return (elem as any).style[attr];
}

export function setCSS(elem: Element, attr: string, value: any): void {
  (elem as any).style[attr] = value;
}

export function ensureElement(elemOrId: Element | string, root: any = null): Element {
  if (typeof elemOrId === "string") {
    if (root == null) root = document;
    return root.querySelector(elemOrId);
  } else {
    return elemOrId;
  }
}

/*
export function setEnabled(elem: Element, enable = true): Element {
  elem.prop("disabled", !enable);
  return elem;
}

export function setVisible(elem: Element, show = true): Element {
  if (show) {
    elem.show();
  } else {
    elem.hide();
  }
  return elem;
}

export function getcssint(elem: JQuery<HTMLElement>, attrib: string): number{
  return parseInt(elem.css(attrib).replace(/px/, ""));
}

export function centerElem(elem: JQuery<HTMLElement>, axis: string) {
  const parent = elem.parent();
  const horizPadding =
    getcssint(elem, "padding-left") +
    getcssint(elem, "padding-right") +
    getcssint(elem, "margin-left") +
    getcssint(elem, "margin-right") +
    getcssint(parent, "border-left") +
    getcssint(parent, "border-right");
  const vertPadding =
    getcssint(elem, "padding-top") +
    getcssint(elem, "padding-bottom") +
    getcssint(elem, "margin-top") +
    getcssint(elem, "margin-bottom") +
    getcssint(parent, "border-top") +
    getcssint(parent, "border-bottom");
  const finalHeight: number = (parent.height() as number) - vertPadding;
  const finalWidth: number = (parent.width() as number) - horizPadding;
  if (axis == "x") {
    elem.css("left", (finalWidth - (elem.width() as number)) / 2);
  } else if (axis == "y") {
    elem.css("top", (finalHeight - (elem.height() as number)) / 2);
  } else {
    elem.css("left", (finalWidth - (elem.width() as number)) / 2);
    elem.css("top", (finalHeight - (elem.height() as number)) / 2);
  }
}

export function fillChildComponent(elem: JQuery<HTMLElement>) {
  const parent = elem.parent();
  const horizPadding =
    getcssint(elem, "padding-left") +
    getcssint(elem, "padding-right") +
    getcssint(elem, "margin-left") +
    getcssint(elem, "margin-right") +
    getcssint(parent, "border-left") +
    getcssint(parent, "border-right");
  const vertPadding =
    getcssint(elem, "padding-top") +
    getcssint(elem, "padding-bottom") +
    getcssint(elem, "margin-top") +
    getcssint(elem, "margin-bottom") +
    getcssint(parent, "border-top") +
    getcssint(parent, "border-bottom");
  const finalHeight = (parent.height() as number) - vertPadding;
  const finalWidth = (parent.width() as number) - horizPadding;
  elem.height(finalHeight);
  elem.width(finalWidth);
}
*/
