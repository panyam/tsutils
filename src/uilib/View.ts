import { getAttr, setAttr, createNode } from "../utils/dom";
import { MAX_INT, Nullable, StringMap } from "../types";
import { LayoutManager } from "./Layouts";
import { Rect, Size, Insets } from "./core";
import { EventHub } from "../events";

declare const ResizeObserver: any;

export type ChildViewLoader = (view: View) => void;

export interface ViewParams {
  childViewLoader?: ChildViewLoader;
}

export class View {
  private static idCounter = 0;
  readonly viewId: string;
  readonly rootElement: Element;
  readonly config: ViewParams;
  readonly eventHub: EventHub;

  // View in which this view can be found.
  parentView: Nullable<View>;

  // Child views of this View
  protected childViews: View[];

  // Bindings of views by key to a child (or descendant view)
  protected viewBindings: StringMap<View>;

  // Denotes if our root element is an svg element or not
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

  /**
   * Will be true once position = absolute has been set for our styles.
   */
  protected isPositionAbsolute = false;

  protected childViewLoader: ChildViewLoader;

  private resizeObserver: any;

  constructor(rootElement: Element, config?: ViewParams) {
    // Save and Validate rootElement before doing anything else
    this.rootElement = rootElement;
    this.isSVG = this.rootElement.namespaceURI == "http://www.w3.org/2000/svg";
    this.originalRootHTML = this.rootElement.innerHTML;
    this.eventHub = new EventHub();
    if (getAttr(this.rootElement, "viewId")) {
      throw new Error("Root element already assigned to a view");
    }
    this.viewId = "" + View.idCounter++;
    setAttr(this.rootElement, "viewId", `${this.rootElement.tagName}${this.viewId}`);
    this.childViews = [];
    this.config = this.processConfigs((config = config || {}));
    this.childViewLoader = config.childViewLoader || View.defaultChildViewLoader;

    // This will ensure children are loaded correctly and we can even intercept them as necessary
    // via config hooks - childViewLoader
    this.loadChildViews();

    // this.updateViewsFromEntity(null);
    // this.layoutChildViews();

    // TODO - should this be here or toggled from else where?
    this.resizeObserver = new ResizeObserver(() => {
      this.layoutChildViews();
    });
    this.resizeObserver.observe(this.rootElement);
  }

  get layoutManager(): Nullable<LayoutManager> {
    return this._layoutManager;
  }

  set layoutManager(layoutMgr: Nullable<LayoutManager>) {
    this._layoutManager = layoutMgr;
  }

  // An option for child classes to extract any other info
  // from the configs while within the constructor before
  // any layouts are created etc.
  protected processConfigs(config: any): any {
    return config;
  }

  /**
   * Once the root view is created and attached, now is the time
   * to create the child view hieararchy.  This method does it
   * while also performing any necessary bindings with the provided
   * entity.  This method is only called once during construction.
   */
  protected loadChildViews(): void {
    this.childViewLoader(this);
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

  /**
   * A short hand way of returning the html of the child views
   * Returning null ensures that children are *not* replaced.
   * Useful for wrapping a html view as is.
   */
  childHtml(): Nullable<string> {
    return null;
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
      if (parent == another || parent.rootElement == another.rootElement) return true;
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
      return (this.rootElement as SVGGraphicsElement).getBBox().width + insWidth;
    } else {
      return (this.rootElement as HTMLElement).offsetWidth + insWidth;
    }
  }

  get height(): number {
    const insHeight = this.insets.top + this.insets.bottom;
    if (this.isSVG) {
      return (this.rootElement as SVGGraphicsElement).getBBox().height + insHeight;
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

  protected setBoundsImpl(x: number, y: number, width: number, height: number): void {
    if (this.isSVG) {
      this.rootElement.setAttribute("x", "" + x);
      this.rootElement.setAttribute("y", "" + y);
      this.rootElement.setAttribute("width", "" + width);
      this.rootElement.setAttribute("height", "" + height);
    } else {
      if (!this.isPositionAbsolute) {
        (this.rootElement as HTMLElement).style.position = "absolute";
        this.isPositionAbsolute = true;
      }
      const elem = this.rootElement as HTMLElement;
      elem.style.left = x + "px";
      elem.style.top = y + "px";
      elem.style.width = width + "px";
      elem.style.height = height + "px";
    }
  }

  protected static defaultChildViewLoader: ChildViewLoader = (view: View) => {
    const html = view.childHtml();
    if (html != null) {
      view.rootElement.innerHTML = html;
    }
  };
}
