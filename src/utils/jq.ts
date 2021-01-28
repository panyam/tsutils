type ElemType = any;

export function setCSS(elem: ElemType, attr: string, value: any): void {
  // TODO
  elem.css(attr, value);
}

export function ensureElement(elemOrId: ElemType | string, root: any = null) {
  if (typeof elemOrId === "string") {
    if (root != null && root.length > 0) return root.find("#" + elemOrId);
    else return $("#" + elemOrId);
  } else {
    if (elemOrId.find) {
      return elemOrId;
    } else {
      return $(elemOrId);
    }
  }
}

export function ensureCreated(elemOrId: ElemType | string, root: any = null, elemType = "div") {
  let out = ensureElement(elemOrId, root);
  if (out == null || out.length == 0) {
    // creat it then
    out = $("<" + elemType + "></" + elemType + ">");
    if (elemOrId != null && typeof elemOrId === "string") out.attr("id", elemOrId);
    if (root == null) root = $("body");
    root.append(out);
  }
  return out;
}

export function setEnabled(elem: ElemType, enable = true) {
  elem.prop("disabled", !enable);
  return elem;
}

export function setVisible(elem: ElemType, show = true) {
  if (show) {
    elem.show();
  } else {
    elem.hide();
  }
  return elem;
}
