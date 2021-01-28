import { getAttr, setAttr, createNode } from "../utils/dom";
import { MAX_INT, Nullable } from "../types";
import { LayoutManager } from "./Layouts";

export interface ViewParams {
  parent?: Nullable<Element>;
  rootElement?: Nullable<Element>;
  document?: Document;
}

export class Point {
  x = 0;
  y = 0;
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
}

export class Size {
  width = 0;
  height = 0;
  constructor(w = 0, h = 0) {
    this.width = w;
    this.height = h;
  }
}

export class Insets {
  left: number;
  top: number;
  right: number;
  bottom: number;
  constructor(left = 0, top = 0, right = 0, bottom = 0) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
  }
}

export class Rect {
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  constructor(x = 0, y = 0, w = 0, h = 0) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
  }
}

export class View<EntityType = any> {
  private static idCounter = 0;
  private static counter = 0;
  readonly uuid: string = "" + View.counter++;
  readonly rootElement: Element;
  readonly config: ViewParams;
  protected _entity: Nullable<EntityType>;

  // View in which this view can be found.
  parentView: Nullable<View>;

  // Child views of this View
  protected childViews: View[] = [];

  readonly isSVG: boolean;

  /**
   * Given we can create View ONTO an existing dom element
   * this holds the original innerHTML of the element incase
   * it is every needed by our own construction.
   */
  protected readonly originalRootHTML;

  /**
   * Views have layout managers that control how child views
   * are laid out.
   */
  protected _layoutManager: Nullable<LayoutManager> = null;

  constructor(entity: Nullable<EntityType> = null, config?: ViewParams) {
    this._entity = entity;
    this.config = config = config || {};
    this.originalRootHTML = "";
    if (this.config.rootElement) {
      this.rootElement = this.config.rootElement;
      this.originalRootHTML = this.rootElement.innerHTML;
    } else if (config.parent) {
      const doc = config.document || document;
      this.rootElement = this.createRootElement(doc);
      config.parent.appendChild(this.rootElement);
      // Also give it an auto generated ID if an id was not provided
      if (!getAttr(this.rootElement, "id")) {
        setAttr(
          this.rootElement,
          "id",
          `${this.rootElement.tagName}${View.idCounter++}`
        );
      }
    } else {
      throw new Error(
        "Either 'rootElement' or a 'parent' param must be provided."
      );
    }
    this.isSVG = this.rootElement.namespaceURI == "http://www.w3.org/2000/svg";
    this.processConfigs(config);
    this.createChildElements();
    this.setupChildViews();
    this.updateViewsFromEntity(null);
    this.layoutChildViews();
  }

  get layoutManager(): Nullable<LayoutManager> {
    return this._layoutManager;
  }

  set layoutManager(layoutMgr: Nullable<LayoutManager>) {
    this._layoutManager = layoutMgr;
  }

  /**
   * Tag name of the root node element for default Element creations.
   */
  get rootNodeName(): string {
    return "div";
  }

  // An option for child classes to extract any other info
  // from the configs while within the constructor before
  // any layouts are created etc.
  protected processConfigs(config: any): void {
    //
  }

  /**
   * Instantiates the root node for this view without attaching to
   * a parent.
   */
  protected createRootElement(doc: Document): Element {
    return createNode(this.rootNodeName, { doc: doc });
  }

  /**
   * Once the root view is created and attached, now is the time
   * to create the child view hieararchy.  This method does it
   * while also performing any necessary bindings with the provided
   * entity.  This method is only called once during construction.
   */
  protected createChildElements(): void {
    const html = this.childHtml();
    this.rootElement.innerHTML = html;
  }

  /**
   * After child elements are created this is an opportunity to
   * add additional bindings for them.
   */
  protected setupChildViews(): void {
    // implement this
  }

  /**
   * Called to layout children after views have been created and bounded.
   */
  layoutChildViews(): void {
    this.layoutManager?.layoutChildViews(this);
  }

  find(target: string): Nullable<Element> {
    return this.rootElement.querySelector(target);
  }

  findAll(target: string): NodeList {
    return this.rootElement.querySelectorAll(target);
  }

  refreshViews(): void {
    this.updateViewsFromEntity(null);
  }

  /**
   * A short hand way of returning the html of the child views
   */
  childHtml(): string {
    return "";
  }

  get entity(): Nullable<EntityType> {
    return this._entity;
  }

  set entity(entity: Nullable<EntityType>) {
    if (entity != this._entity && this.isEntityValid(entity)) {
      this._entity = entity;
      this.refreshViews();
    }
  }

  /**
   * This method is called to update the entity based on what has
   * been input/entered into the views.  By default it does nothing.
   */
  protected updateEntityFromViews(): Nullable<EntityType> {
    return this._entity;
  }

  /**
   * Called when the entity has been updated in order to update the views
   * and/or their contents.
   * This method is called with the "previous" entity as the latest
   * entity is already set in this View.  This will help the View
   * reconcile any diffs.
   */
  protected updateViewsFromEntity(_previous: Nullable<EntityType>): void {
    // Do nothing - implement this to update view state from entity
  }

  protected isEntityValid(_entity: Nullable<EntityType>): boolean {
    return true;
  }

  get doc(): Document {
    return this.rootElement.ownerDocument;
  }

  get childViewCount(): number {
    return this.childViews.length;
  }

  childAtIndex(index: number): View {
    return this.childViews[index];
  }

  /**
   * Return the index of a given child.
   */
  indexOfChild(childView: View): number {
    for (let i = 0; i < this.childViews.length; i++) {
      if (childView == this.childViews[i]) return i;
    }
    return -1;
  }

  /**
   * Remove a view.
   */
  removeView(child: View | number): void {
    let index = -1;
    let childView: View;
    if (typeof child === "number") {
      index = child;
      childView = this.childAtIndex(index);
    } else {
      childView = child;
      if (child.parentView != this) {
        return;
      }
      index = this.indexOfChild(child);
    }

    if (index >= 0) {
      this.layoutManager?.removeView(childView);
      childView.parentView = null;
      this.childViews.splice(index, 1);
      this.setLayoutNeeded();
    }
  }

  _layoutNeeded = true;
  protected setLayoutNeeded(): void {
    this._layoutNeeded = true;
  }

  /**
   * Adds a new child view optional with its layout constraints and at a
   * specific index.
   */
  addView(child: View, layoutConstraints: any = null, index = -1): void {
    if (index > this.childViews.length || index < -1) {
      throw new Error("Invalid index.  Must be -1 or < numChildViews");
    }

    // Ensure child is not a "parent" of us
    if (this.isDescendantOf(child)) {
      throw new Error("Child is an ancestor of this view");
    }

    // Remove from old parent first
    if (child.parentView == this) {
      // within same parent so simply move them around
      const childIndex = this.indexOfChild(child);
      if (childIndex != index) {
        const temp = this.childViews[index];
        this.childViews[index] = this.childViews[childIndex];
        this.childViews[childIndex] = temp;
      } else {
        // If index has not changed do nothing
      }
    } else {
      if (child.parentView != null) {
        child.parentView.removeView(child);
      } else {
        // New child - no parent so can add safely
        if (index < 0) {
          this.childViews.push(child);
        } else {
          this.childViews.splice(index, 0, child);
        }
      }
      child.parentView = this;
    }
    this.setLayoutNeeded();
    if (this.layoutManager != null) {
      this.layoutManager.addView(child, layoutConstraints);
    }
  }

  /**
   * Returns true if we are a descendant of another View.
   */
  isDescendantOf(another: View): boolean {
    if (another == this) return true;
    let parent: Nullable<View> = this.parentView;
    while (parent != null) {
      if (parent == another || parent.rootElement == another.rootElement)
        return true;
      parent = parent.parentView;
    }
    return false;
  }

  invalidateLayout(): void {
    this.layoutManager?.invalidateLayout(this);
    this.parentView?.invalidateLayout();
  }

  /**
   * Get and Set pref Sizes.
   */
  protected _prefSizeSet = false;
  protected _prefSize: Nullable<Size> = null;
  get prefSize(): Size {
    let dim = this._prefSize;
    if (dim == null || !(this._prefSizeSet || this.isValid)) {
      if (this.layoutManager != null) {
        this._prefSize = this.layoutManager.prefLayoutSize(this);
      } else {
        // TODO - see if the underlying rootElement has a preferred
        // size - only if not then we should return minSize
        this._prefSize = this.minSize;
      }
      dim = this._prefSize;
    }
    return new Size(dim.width, dim.height);
  }
  setPreferredSize(size: Nullable<Size>): this {
    this._prefSize = size;
    this._prefSizeSet = size != null;
    return this;
  }

  get isValid(): boolean {
    return true;
  }

  /**
   * Get and Set min Sizes.
   */
  protected _minSizeSet = false;
  protected _minSize: Nullable<Size> = null;
  get minSize(): Size {
    let dim = this._minSize;
    if (dim == null || !(this._minSizeSet || this.isValid)) {
      if (this.layoutManager != null) {
        this._minSize = this.layoutManager.minLayoutSize(this);
      } else {
        // super.minSize
        return new Size(this.width, this.height);
      }
      dim = this._minSize;
    }

    return new Size(dim.width, dim.height);
  }
  setMinimumSize(size: Nullable<Size>): this {
    this._minSize = size;
    this._minSizeSet = size != null;
    return this;
  }

  /**
   * Get and Set max Sizes.
   */
  protected _maxSizeSet = false;
  protected _maxSize: Nullable<Size> = null;
  get maxSize(): Size {
    let dim = this._maxSize;
    if (dim == null || !(this._maxSizeSet || this.isValid)) {
      if (this.layoutManager != null) {
        this._maxSize = this.layoutManager.maxLayoutSize(this);
      } else {
        if (this._maxSizeSet) {
          return new Size(this._maxSize!.width, this._maxSize!.height);
        } else {
          return new Size(MAX_INT, MAX_INT);
        }
      }
      dim = this._maxSize;
    }
    return new Size(dim.width, dim.height);
  }
  setMaximumSize(size: Nullable<Size>): this {
    this._maxSize = size;
    this._maxSizeSet = size != null;
    return this;
  }

  get isVisible(): boolean {
    // TODO - check visibility of root element
    if (this.isSVG) {
      getAttr(this.rootElement, "visibility") != "hidden";
    }

    return true;
  }

  set isVisible(visible: boolean) {
    if (this.isSVG) {
      setAttr(this.rootElement, "visibility", visible ? "visible" : "hidden");
    }
    this.parentView?.invalidateLayout();
  }

  getBaseline(width: number, height: number): number {
    return -1;
  }

  private _insets = new Insets();
  get insets(): Insets {
    return this._insets;
  }

  set insets(insets: Insets) {
    this._insets = insets;
    this.invalidateLayout();
  }

  /**
   * Horizontal layout alignment used by layout managers.
   */
  alignmentX = 0.5;

  /**
   * Vertical layout alignment used by layout managers.
   */
  alignmentY = 0.5;

  get x(): number {
    if (this.isSVG) {
      return (this.rootElement as SVGGraphicsElement).getBBox().x;
    } else {
      return (this.rootElement as HTMLElement).offsetLeft;
    }
  }

  get y(): number {
    if (this.isSVG) {
      return (this.rootElement as SVGGraphicsElement).getBBox().y;
    } else {
      return (this.rootElement as HTMLElement).offsetTop;
    }
  }

  get width(): number {
    const insWidth = this.insets.left + this.insets.right;
    if (this.isSVG) {
      return (
        (this.rootElement as SVGGraphicsElement).getBBox().width + insWidth
      );
    } else {
      return (this.rootElement as HTMLElement).offsetWidth + insWidth;
    }
  }

  get height(): number {
    const insHeight = this.insets.top + this.insets.bottom;
    if (this.isSVG) {
      return (
        (this.rootElement as SVGGraphicsElement).getBBox().height + insHeight
      );
    } else {
      return (this.rootElement as HTMLElement).offsetHeight + insHeight;
    }
  }

  get size(): Size {
    return new Size(this.width, this.height);
  }

  get bounds(): Rect {
    return new Rect(this.x, this.y, this.width, this.height);
  }

  setLocation(x: number, y: number): this {
    return this.setBounds(x, y, this.width, this.height);
  }

  setSize(width: number, height: number): this {
    return this.setBounds(this.x, this.y, width, height);
  }

  setBounds(x: number, y: number, width: number, height: number): this {
    const resized = width != this.width || height != this.height;
    const moved = x != this.x || y != this.y;
    if (resized || moved) {
      this.setBoundsImpl(x, y, width, height);
      if (resized) {
        this.invalidateLayout();
      }
    }
    return this;
  }

  protected setBoundsImpl(
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // if (this.rootElement.tagName == "svg") {
    if (this.isSVG) {
      this.rootElement.setAttribute("x", "" + x);
      this.rootElement.setAttribute("y", "" + y);
      this.rootElement.setAttribute("width", "" + width);
      this.rootElement.setAttribute("height", "" + height);
    } else {
      this.rootElement.setAttribute("left", x + "px");
      this.rootElement.setAttribute("top", y + "px");
      this.rootElement.setAttribute("width", width + "px");
      this.rootElement.setAttribute("height", height + "px");
      // throw new Error("Not Implemented");
    }
  }
}
