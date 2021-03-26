import { Nullable } from "../types";
import { View } from "./View";
import { getAttr, createNode } from "../utils/dom";

export class Dialog extends View {
  title: string;
  titleView: HTMLSpanElement;
  closeButton: HTMLSpanElement;
  modalContentDiv: HTMLDivElement;
  buttonContainer: HTMLDivElement;
  resolveFunc: any;
  rejectFunc: any;
  shouldClose: Nullable<(index: number, title: string) => boolean> = null;
  private opened = false;
  private contentHtml: string;

  constructor(config: any) {
    super(Dialog.newHolder(), config);
  }

  static newHolder(config: any = null): Element {
    // create a "holder" instead
    config = config || {};
    const styles = [
      "position: absolute",
      "left: 0px",
      "right: 0px",
      "bottom: 0px",
      "top: 0px",
      "background-color: rgb(90, 90, 90)",
      "background-color: rgba(90, 90, 90, 0.4)",
      "z-index: " + (config.zIndex || 10),
    ];
    const out = createNode("div", {
      attrs: { style: styles.join("; ") },
    }) as HTMLDivElement;
    out.style.display = "none";
    document.body.appendChild(out);
    return out;
  }

  processConfigs(config: any): any {
    this.contentHtml = config.content || "Hello World";
    this.title = config.title || "Title";
    config.buttons = config.buttons || ["Ok", "Cancel"];
    return config;
  }

  childHtml(): string {
    return `<div class = "modalDialog">
              <span class="titleView">${this.title}</span>
              <span class="closeButton">&times;</span>
              <div class="modalContentDiv">${this.contentHtml}</div>
              <div class = "buttonContainer"></div>
            </div>`;
  }

  loadChildViews(): void {
    super.loadChildViews();
    this.titleView = this.find(".titleView") as HTMLSpanElement;
    this.closeButton = this.find(".closeButton") as HTMLSpanElement;
    this.modalContentDiv = this.find(".modalContentDiv") as HTMLDivElement;
    this.buttonContainer = this.find(".buttonContainer") as HTMLDivElement;
    for (const title of (this.config as any).buttons || []) {
      this.addButton(title);
    }
    this.closeButton.addEventListener("click", (evt) => {
      this.close(-1, "Close");
    });
  }

  async open(): Promise<any> {
    if (this.opened) {
      return false;
    }
    return new Promise((resolve, reject) => {
      this.resolveFunc = resolve;
      this.rejectFunc = reject;
      this.setVisible(true);
    });
  }

  protected onButtonClicked(evt: Event): void {
    const target = evt.target as HTMLElement;
    const index = parseInt(getAttr(target, "index") || "-1");
    const title = getAttr(target, "title") || "";
    this.close(index, title);
  }

  close(index = -1, title = ""): boolean {
    if (this.shouldClose != null && !this.shouldClose(index, title))
      return false;
    if (this.resolveFunc != null) {
      this.resolveFunc([index, title]);
    }
    this.setVisible(false);
    return true;
  }

  setVisible(vis = true): void {
    (this.rootElement as HTMLElement).style.display = vis ? "" : "none";
  }

  destroy(): void {
    this.rootElement.remove();
  }

  addButton(title: string): this {
    const index = this.buttonContainer.querySelectorAll(".modalDialogButton")
      .length;
    const btn = createNode("button", {
      attrs: { index: index, title: title, class: "modalDialogButton" },
      text: title,
    }) as HTMLButtonElement;
    this.buttonContainer.appendChild(btn);
    btn.addEventListener("click", this.onButtonClicked.bind(this));
    return this;
  }
}
