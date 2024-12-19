import { Application } from "pixi.js";

export class ResizeHandler {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
    this.onResize = this.onResize.bind(this);
    window.addEventListener("resize", this.onResize);
    this.onResize(); // Initial sizing
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.app.renderer.resize(width, height);
  }

  destroy() {
    window.removeEventListener("resize", this.onResize);
  }
}
