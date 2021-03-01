import { Nullable, StringMap } from "../types";
import { assert } from "../utils/misc";
import { createNode } from "../utils/dom";

enum MenuItemType {
  PARENT,
  ITEM,
  SEPERATOR,
}

/**
 * The list of menu items shown in a row.
 */
interface MenuItemsView {
  /**
   * Show or hide the item view.
   */
  show(visible: boolean): void;
}

class MenuItem {
  id: string;
  itemType: MenuItemType;
  label = "";
  key: string;
  elem: HTMLElement;
  parent: Nullable<MenuItem> = null;
  children: MenuItem[] = [];

  // Element to hold the label
  labelElem: HTMLElement;

  // Element to hold children (for menuparents only)
  childrenElem: Nullable<HTMLElement> = null;
}

export class Menubar {
  private idCounter: number;
  rootElement: HTMLDivElement;
  menuItems: StringMap<MenuItem>;
  rootMenus: MenuItem[];

  constructor(rootDiv: HTMLDivElement) {
    this.rootElement = rootDiv;
    this.idCounter = 0;
    this.rootMenus = [];
    this.menuItems = {};
    const nodes = rootDiv.querySelectorAll("div.menuparent, hr.seperator, span.menuitem");
    nodes.forEach((node) => {
      const elem = node as HTMLElement;
      this.assignMenuId(elem);
      this.toMenuItem(elem);
    });
    // now time to lay this all out
    this.rootMenus.forEach((mi) => this.ensureMenuItemView(mi, this.rootElement));
  }

  protected assignMenuId(elem: HTMLElement): string {
    if (elem.getAttribute("menuId")) {
      throw new Error("Element already has a menu ID");
    }
    const id = "" + ++this.idCounter;
    elem.setAttribute("menuId", id);
    return id;
  }

  protected toMenuItem(elem: HTMLElement): Nullable<MenuItem> {
    if (
      !elem.classList.contains("menuparent") &&
      !elem.classList.contains("menuitem") &&
      !elem.classList.contains("seperator")
    ) {
      return null;
    }

    const id = elem.getAttribute("menuId");
    assert(id != null, "Menu item must have a menuId");
    if (!(id in this.menuItems)) {
      const out = new MenuItem();
      out.id = id;
      out.elem = elem;
      const tag = elem.tagName.toLowerCase();
      if (tag == "hr") {
        out.itemType = MenuItemType.SEPERATOR;
        out.key = elem.getAttribute("menuKey") || "";
      } else if (tag == "span") {
        out.itemType = MenuItemType.ITEM;
        out.label = elem.innerText || "Item";
        out.key = elem.getAttribute("menuKey") || elem.innerText;
      } else if (tag == "div") {
        out.itemType = MenuItemType.PARENT;
        out.label = elem.getAttribute("title") || "Menu";
        out.key = elem.getAttribute("menuKey") || elem.innerText;
      }
      const parentElem = elem.parentElement;
      if (parentElem) {
        out.parent = this.toMenuItem(parentElem);
        if (out.parent == null) {
          this.rootMenus.push(out);
        } else {
          out.parent.children.push(out);
        }
      }
      // remove it from the parent
      elem.remove();
      this.menuItems[id] = out;
    }
    return this.menuItems[id] || null;
  }

  protected ensureMenuItemView(menuItem: MenuItem, parent: HTMLElement): void {
    // todo
    if (menuItem.itemType == MenuItemType.SEPERATOR) {
      menuItem.labelElem = createNode("hr", {
        attrs: {
          class: "menuSeparator",
          menuId: menuItem.id,
        },
      }) as HTMLElement;
      menuItem.labelElem.addEventListener("click", (evt) => this.onMenuItem(evt));
      parent.appendChild(menuItem.labelElem);
    } else {
      const miClass = menuItem.parent == null ? "menuRootItemLabel" : "menuItemLabel";
      menuItem.labelElem = createNode("div", {
        attrs: {
          class: miClass,
          menuId: menuItem.id,
        },
        text: menuItem.label,
      }) as HTMLSpanElement;
      menuItem.labelElem.addEventListener("click", (evt) => this.onMenuItem(evt));
      parent.appendChild(menuItem.labelElem);

      if (menuItem.children.length > 0) {
        menuItem.childrenElem = createNode("div", {
          attrs: {
            class: "menuItemContainer",
            menuId: menuItem.id,
          },
        }) as HTMLDivElement;
        menuItem.labelElem.append(menuItem.childrenElem);
        for (const child of menuItem.children) {
          this.ensureMenuItemView(child, menuItem.childrenElem);
        }
      }
    }
  }

  protected onMenuItem(evt: Event): void {
    const target = evt.target as HTMLElement;
    const id = target.getAttribute("menuId");
    if (id) {
      const mi = this.menuItems[id];
      if (mi.itemType == MenuItemType.PARENT) {
        // toggle child
        const visible = this.isMenuItemShowing(mi);
        this.showMenuItem(mi, !visible);
      }
    }
  }

  isMenuItemShowing(menuItem: MenuItem): boolean {
    const container = menuItem.childrenElem;
    return container!.style.visibility == "visible";
  }

  showMenuItem(menuItem: MenuItem, visible = true): void {
    const container = menuItem.childrenElem;
    if (container) {
      if (visible) {
        // show every thing upto parent
        if (menuItem.parent) this.showMenuItem(menuItem.parent);
        container.style.visibility = "visible";
      } else {
        container.style.visibility = "hidden";
      }
    }
  }
}
