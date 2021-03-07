import { Nullable, StringMap } from "../types";
import { assert } from "../utils/misc";
import { createNode } from "../utils/dom";
import { EventHub, TEvent } from "../comms/events";

export enum EventTypes {
  MENU_WILL_CLOSE = "MENU_WILL_CLOSE",
  MENU_WILL_OPEN = "MENU_WILL_OPEN",
  MENU_CLOSED = "MENU_CLOSED",
  MENU_OPENED = "MENU_OPENED",
  MENU_ITEM_CLICKED = "MENU_ITEM_CLICKED",
}

enum MenuItemType {
  PARENT,
  ITEM,
  SEPARATOR,
}

export class MenuItem {
  readonly menubar: Menubar;
  readonly id: string;
  readonly type: MenuItemType;
  readonly elem: HTMLElement;
  parent: Nullable<MenuItem>;
  key: string;

  // Element to hold the label
  label = "";
  labelElem: HTMLElement;

  // Element to hold children (for menuparents only)
  children: MenuItem[] = [];
  childrenElem: Nullable<HTMLElement> = null;

  constructor(type: MenuItemType, id: string, elem: HTMLElement, menubar: Menubar, parent: Nullable<MenuItem> = null) {
    this.id = id;
    this.type = type;
    this.elem = elem;
    this.menubar = menubar;
    this.parent = parent;
  }

  /**
   * Tells whether this is a root item.
   */
  get isRoot(): boolean {
    return this.parent == null;
  }

  /**
   * Gets the root menu item of this item.
   */
  get root(): MenuItem {
    if (this.parent == null) return this;
    return this.parent.root;
  }
}

export class Menubar extends EventHub {
  private idCounter: number;
  rootElement: HTMLDivElement;
  menuItems: StringMap<MenuItem>;
  rootMenus: MenuItem[];

  constructor(rootDiv: HTMLDivElement) {
    super();
    this.rootElement = rootDiv;
    this.idCounter = 0;
    this.rootMenus = [];
    this.menuItems = {};
    const nodes = rootDiv.querySelectorAll("div.menuparent, hr.separator, span.menuitem");
    nodes.forEach((node) => {
      const elem = node as HTMLElement;
      this.assignMenuId(elem);
      this.toMenuItem(elem);
    });
    // now time to lay this all out
    this.rootMenus.forEach((mi) => this.ensureMenuItemView(mi, this.rootElement));
    document.addEventListener("click", (evt) => {
      this.onDocumentClicked(evt);
    });
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
      !elem.classList.contains("separator")
    ) {
      return null;
    }

    const id = elem.getAttribute("menuId");
    assert(id != null, "Menu item must have a menuId");
    if (!(id in this.menuItems)) {
      let out: MenuItem;
      const tag = elem.tagName.toLowerCase();
      if (tag == "hr") {
        out = new MenuItem(MenuItemType.SEPARATOR, id, elem, this);
        out.key = elem.getAttribute("menuKey") || "";
      } else if (tag == "span") {
        out = new MenuItem(MenuItemType.ITEM, id, elem, this);
        out.label = elem.innerText || "Item";
        out.key = elem.getAttribute("menuKey") || elem.innerText;
      } else if (tag == "div") {
        out = new MenuItem(MenuItemType.PARENT, id, elem, this);
        out.label = elem.getAttribute("title") || "Menu";
        out.key = elem.getAttribute("menuKey") || elem.innerText;
      } else {
        throw new Error("Unsupported menu item type");
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
    if (menuItem.type == MenuItemType.SEPARATOR) {
      menuItem.labelElem = createNode("hr", {
        attrs: {
          class: "menuSeparator",
          menuId: menuItem.id,
        },
      }) as HTMLElement;
      menuItem.labelElem.addEventListener("click", (evt) => this.onMenuItemClicked(evt));
      menuItem.labelElem.addEventListener("mouseenter", (evt) => this.onMenuItemEntered(evt));
      menuItem.labelElem.addEventListener("mouseleave", (evt) => this.onMenuItemExited(evt));
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
      menuItem.labelElem.addEventListener("click", (evt) => this.onMenuItemClicked(evt));
      menuItem.labelElem.addEventListener("mouseenter", (evt) => this.onMenuItemEntered(evt));
      menuItem.labelElem.addEventListener("mouseleave", (evt) => this.onMenuItemExited(evt));
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

  protected eventToMenuItem(evt: Event): Nullable<MenuItem> {
    const target = evt.target as HTMLElement;
    const id = target.getAttribute("menuId");
    if (id) {
      return this.menuItems[id] || null;
    }
    return null;
  }

  protected onMenuItemEntered(evt: Event): void {
    const mi = this.eventToMenuItem(evt);
    if (!mi) return;
    console.log("Menu Item Entered: ", mi);
  }

  protected onMenuItemExited(evt: Event): void {
    const mi = this.eventToMenuItem(evt);
    if (!mi) return;
    console.log("Menu Item Exited: ", mi);
  }

  private currentShowingMenuParent: Nullable<MenuItem> = null;
  protected onMenuItemClicked(evt: Event): void {
    const mi = this.eventToMenuItem(evt);
    if (!mi) return;
    evt.stopPropagation();
    if (mi.type == MenuItemType.PARENT && mi.childrenElem) {
      // toggle child
      const show = !this.isMenuItemShowing(mi);
      const evt = new TEvent(show ? EventTypes.MENU_WILL_OPEN : EventTypes.MENU_WILL_CLOSE, this, mi);
      this.dispatchEvent(evt);
      if (evt.cancelled) {
        return;
      }
      if (show) {
        // hide all other menu items upto the common ancestor.
        // const curr = this.currentMenujj
        this.hideMenus();
        this.currentShowingMenuParent = mi;
      } else if (this.currentShowingMenuParent != null) {
        this.currentShowingMenuParent = this.currentShowingMenuParent.parent;
      }
      this.showMenuItem(mi, show);
      this.dispatchEvent(new TEvent(show ? EventTypes.MENU_OPENED : EventTypes.MENU_CLOSED, this, mi));
    } else if (mi.type == MenuItemType.SEPARATOR) {
      // Do nothing - for now
    } else {
      const miEvt = new TEvent(EventTypes.MENU_ITEM_CLICKED, this, mi);
      this.dispatchEvent(miEvt);
      if (!miEvt.cancelled) {
        // hide it
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

  onDocumentClicked(evt: Event) {
    // see if clicked on a menu element
    let target = evt.target as Nullable<HTMLElement>;
    while (target) {
      if (target.getAttribute("menuId")) {
        return;
      }
      target = target.parentElement;
    }
    console.log("Clicked on Document:", evt);
    this.hideMenus();
  }

  hideMenus(all = false): void {
    while (this.currentShowingMenuParent != null) {
      this.showMenuItem(this.currentShowingMenuParent, false);
      this.currentShowingMenuParent = this.currentShowingMenuParent.parent;
    }
  }
}
