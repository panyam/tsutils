import { Nullable } from "../types";
import { View } from "./View";
import { BorderLayout, BorderLayoutConstraint } from "./BorderLayout";

export class Dialog extends View {
  title: string;
  titleView: View;
  buttonsView: View;
  resolveFunc: any;
  rejectFunc: any;
  shouldClose: Nullable<(data: any) => boolean> = null;
  protected _buttons: any[];
  private opened = false;

  childHtml(): string {
    return `
    div class = "modalContainer">
      <span class="titleView">${this.title}</span>
      <span class="closeButton">&times;</span>
      <div class="modalContentDiv">Hello World</div>
      <div class = "buttonContainer"></div>
    </div>
    `;
  }

  loadChildViews(): void {
    super.loadChildViews();
    this.titleView = new View(this.find("title")!);
    this.layoutManager = new BorderLayout();
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

  close(data: Nullable<any> = null): boolean {
    if (this.shouldClose != null && !this.shouldClose(data)) return false;
    if (this.resolveFunc != null) {
      this.resolveFunc(data);
    }
    this.setVisible(false);
    return true;
  }

  setVisible(vis = true): void {
    // todo
  }

  destroy(): void {
    // todo
  }

  buttons(): any[] {
    return this._buttons;
  }

  addButton(title: string, data: any = null): this {
    this._buttons = this._buttons || [];
    const b = {} as any;
    b["title"] = b["text"] = title;
    b["data"] = data;
    b["click"] = () => {
      this.close(b);
    };
    this._buttons.push(b);
    return this;
  }

  setButtons(b: any[]): this {
    this._buttons = [];
    b.forEach((v: any, _index: number) => {
      if (typeof v === "string") this.addButton(v);
      else this.addButton(v.title, v.data);
    });
    return this;
  }
}
