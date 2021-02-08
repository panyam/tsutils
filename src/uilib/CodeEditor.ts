import { View, ViewParams } from "./Views";
import { ScrollGroup } from "./Scrolling";
import { StringMap } from "../types";
import { collectStream, streamDict, mapStream } from "../utils/streams";

export class CodeEditor extends View<string> {
  private _scrollGroup: ScrollGroup;
  textarea: HTMLTextAreaElement;
  lineNumbersDiv: HTMLDivElement;
  lineCount = 0;

  get scrollGroup(): ScrollGroup {
    return this._scrollGroup;
  }

  get lineNumbersWidth(): number {
    return 50;
  }

  get lineNumbersStyle(): StringMap<any> {
    return {
      "font-size": "13px",
      "line-height": "13px",
      padding: "10px 4px",
      "font-family": " monospace",
      background: " #EEE",
      position: " absolute",
      "text-align": "right",
      border: "1px solid #999",
    };
  }

  get textAreaStyle(): StringMap<any> {
    return {
      "font-size": "13px",
      "line-height": "13px",
      padding: "10px 4px",
      "font-family": " monospace",
      background: " #EEE",
      border: "1px solid #999",
    };
  }

  childHtml(): string {
    /* The following three rules make a difference in the script */
    const lineNumberStyles = {
      ...this.lineNumbersStyle,
      position: "absolute",
      left: "0px",
      top: "0px",
      bottom: "0px",
      "overflow-x": "none",
      "overflow-y": "scroll",
    };
    const textAreaStyles = {
      ...this.textAreaStyle,
      position: "absolute",
      top: "0px",
      bottom: "0px",
      resize: "none",
      height: "100%",
      "box-sizing": "border-box",
      "overflow-x": "scroll",
      "overflow-y": "scroll",
      "white-space": "nowrap",
    };

    const toProp = (key: string, value: unknown): string =>
      key + ": " + value + ";";
    const lineNumStylesStr = collectStream(
      mapStream(streamDict(lineNumberStyles), (x: [string, string]) =>
        toProp(x[0], x[1])
      ),
      (prop, out) => prop + out,
      ""
    );
    const textAreaStylesStr = collectStream(
      mapStream(streamDict(textAreaStyles), (x: [string, string]) =>
        toProp(x[0], x[1])
      ),
      (prop, out) => prop + out,
      ""
    );
    return `
      <style>
      .lineNumbers::-webkit-scrollbar {
        display: none;
      }
      .lineNumbers {
        -ms-overflow-style: none;  /* IE and Edge */
        scrollbar-width: none;  /* Firefox */
      }
      </style>
      <div class = "lineNumbers" style = "${lineNumStylesStr}"><span>1</span></div>
      <textarea class = codeEditor style = "${textAreaStylesStr}"></textarea>
    `;
  }

  setupChildViews(): void {
    super.setupChildViews();
    if (!this._scrollGroup) {
      this._scrollGroup = new ScrollGroup();
    }
    this._scrollGroup.clear();
    this.textarea = this.find(".codeEditor") as HTMLTextAreaElement;
    this.lineNumbersDiv = this.find(".lineNumbers") as HTMLDivElement;
    this.textarea.addEventListener("keydown", (e) => this.onKeyEvent(e));
    this.textarea.addEventListener("cut", (e) => this.onClipboardEvent(e));
    this.textarea.addEventListener("paste", (e) => this.onClipboardEvent(e));
    this._scrollGroup.add(this.textarea);
    this._scrollGroup.add(this.lineNumbersDiv);
  }

  ensureNumLines(nLines: number): void {
    if (nLines != this.lineCount) {
      let html = "";
      for (let i = 0; i < nLines; i++) {
        html += "<div>" + (i + 1) + "</div>";
      }
      this.lineNumbersDiv.innerHTML = html;
    }
    this.lineCount = nLines;
  }

  refreshLineCount(): void {
    const nLines = this.textarea.value.split("\n").length;
    this.ensureNumLines(nLines);
  }

  protected onKeyEvent(evt: KeyboardEvent): void {
    if (evt.type == "keydown") {
      // Only update lines on line num changing events
      // TODO - Get Smarter about this by looking at selections etc
      if (evt.key == "Enter" || evt.key == "Backspace" || evt.key == "Delete") {
        this.refreshLineCount();
      } else if (evt.key == "Tab") {
        evt.preventDefault();
        this.insertAtSelection("\t");
      }
    }
  }

  insertAtSelection(contents: string): string {
    const textarea = this.textarea;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // set textarea value to: text before caret + tab + text after caret
    textarea.value =
      textarea.value.substring(0, start) +
      contents +
      textarea.value.substring(end);

    // put caret at right position again
    textarea.selectionStart = textarea.selectionEnd = start + 1;
    return textarea.value;
  }

  protected onClipboardEvent(evt: ClipboardEvent): void {
    if (evt.type == "paste") {
      console.log("Handling Paste");
    }
    this.refreshLineCount();
  }

  get value(): string {
    return this.textarea.value;
  }

  set value(val: string) {
    this.textarea.value = val;
    this.refreshLineCount();
  }

  layoutChildViews(): void {
    const parentWidth = this.width;
    this.lineNumbersDiv.style.width = this.lineNumbersWidth + "px";
    this.textarea.style.left = this.lineNumbersWidth + "px";
    const taWidth = parentWidth - this.lineNumbersWidth;
    this.textarea.style.width = taWidth + "px";
    this.textarea.style.right = "0px";
  }
}
