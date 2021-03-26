import { setCSS } from "../utils/dom";
import { View, ViewParams } from "./View";

interface AIViewParams extends ViewParams {
  zIndex?: number;
  bgColor?: any;
  imageUrl?: string;
  modalId?: string;
}

export class ActivityIndicator extends View {
  bgColor: any;
  imageUrl: string;
  zIndex: number;
  modalId: string;

  processConfigs(config?: any): any {
    config = super.processConfigs(config);
    this.zIndex = config.zIndex || 500;
    this.bgColor = config.bgColor || "rgba(10, 10, 10, .6)";
    this.imageUrl = config.imageUrl || "http://i.stack.imgur.com/FhHRx.gif";
    this.modalId = config.modalId || "modal";
    return config;
  }

  loadChildViews(): void {
    super.loadChildViews();
    setCSS(this.rootElement, "position", "absolute");
    setCSS(this.rootElement, "z-index", this.zIndex);
    setCSS(this.rootElement, "left", "0px");
    setCSS(this.rootElement, "top", "0px");
    setCSS(this.rootElement, "bottom", "0px");
    setCSS(this.rootElement, "right", "0px");
    setCSS(
      this.rootElement,
      "background",
      this.bgColor +
        "\n" +
        "url('" +
        this.imageUrl +
        "')\n" +
        "50% 50%\n" +
        "no-repeat"
    );
    this.isVisible = false;
  }
}
