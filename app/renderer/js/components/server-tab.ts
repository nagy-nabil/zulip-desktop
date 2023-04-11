import process from "node:process";

import type {Html} from "../../../common/html.js";
import {html} from "../../../common/html.js";
import {ipcRenderer} from "../typed-ipc-renderer.js";

import {generateNodeFromHtml} from "./base.js";
import type {TabProps} from "./tab.js";
import Tab from "./tab.js";
import type WebView from "./webview.js";

export type ServerTabProps = {
  webview: Promise<WebView>;
} & TabProps;

export default class ServerTab extends Tab {
  webview: Promise<WebView>;
  $el: Element;
  $badge: Element;

  constructor({webview, ...props}: ServerTabProps) {
    super(props);

    this.webview = webview;
    this.$el = generateNodeFromHtml(this.templateHtml());

    this.props.$root.append(this.$el);
    this.registerListeners();

    // (this.$el as HTMLDivElement).addEventListener("dragstart", this.dragStart);
    (this.$el as HTMLDivElement).addEventListener("dragenter", this.dragEnter);
    this.$el.addEventListener("dragleave", this.dragLeave);
    (this.$el as HTMLDivElement).addEventListener("dragover", this.dragOver);
    this.$badge = this.$el.querySelector(".server-tab-badge")!;
  }

  override async activate(): Promise<void> {
    await super.activate();
    (await this.webview).load();
  }

  override async deactivate(): Promise<void> {
    await super.deactivate();
    (await this.webview).hide();
  }

  override async destroy(): Promise<void> {
    await super.destroy();
    (await this.webview).$el.remove();
  }

  templateHtml(): Html {
    return html`
      <div class="tab" draggable="true" data-tab-id="${this.props.tabIndex}">
        <div class="server-tooltip" style="display:none">
          ${this.props.name}
        </div>
        <div class="server-tab-badge"></div>
        <div class="server-tab draggable">
          <img class="server-icons" src="${this.props.icon}" />
        </div>
        <div class="server-tab-shortcut">${this.generateShortcutText()}</div>
      </div>
    `;
  }

  updateBadge(count: number): void {
    this.$badge.textContent = count > 999 ? "1K+" : count.toString();
    this.$badge.classList.toggle("active", count > 0);
  }

  generateShortcutText(): string {
    // Only provide shortcuts for server [0..9]
    if (this.props.index >= 9) {
      return "";
    }

    const shownIndex = this.props.index + 1;

    // Array index == Shown index - 1
    ipcRenderer.send("switch-server-tab", shownIndex - 1);

    return process.platform === "darwin"
      ? `⌘${shownIndex}`
      : `Ctrl+${shownIndex}`;
  }

  updateIndx(index: number) {
    this.props.index = index;
    this.props.tabIndex = index;
    const shownIndex = this.props.index + 1;
    const shortcut =
      process.platform === "darwin" ? `⌘${shownIndex}` : `Ctrl+${shownIndex}`;
    (
      this.$el.querySelector(".server-tab-shortcut") as HTMLDivElement
    ).innerHTML = shortcut;
    this.$el.setAttribute("data-tab-id", "" + this.props.index);
  }

  // todo add css to indicate where the drop will end be

  dragEnter(this: HTMLElement, e: DragEvent) {
    // console.log('Event: ', 'dragenter');
    if (e.dataTransfer === null) {
      throw new Error("must have start index here");
      return;
    }
    const targetIndex = +e.dataTransfer.getData("text/plain");
    console.log(
      "🪵 [server-tab.ts:125] ~ token ~ \x1b[0;32me.dataTransfer.getData();\x1b[0m = ",
      e.dataTransfer.getData("text/plain"),
    );
    const currentIdStr = this.getAttribute("data-tab-id");
    if (currentIdStr === null) {
      throw new Error("current item with no id how");
      return;
    }
    const currentId = +currentIdStr;
    console.log(`iam ${targetIndex} got into ${currentId}`);
    if (targetIndex > currentId) {
      console.log("add border down");
      this.classList.add("dropdown");
    } else {
      console.log("add border up");
      this.classList.add("dropup");
    }
  }

  dragLeave(this: HTMLElement) {
    // console.log('Event: ', 'dragleave');
    this.classList.remove("dropup");
    this.classList.remove("dropdown");
  }

  dragOver(e: DragEvent) {
    // console.log('Event: ', 'dragover');
    e.preventDefault();
    if (e.dataTransfer !== null) e.dataTransfer.dropEffect = "move";
  }
}
