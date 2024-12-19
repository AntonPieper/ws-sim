import { Application, FederatedPointerEvent } from "pixi.js";
import { AppState } from "../data/AppState";
import { EventBus } from "../EventBus";

interface EventMap {
  "camera:moved": (
    centerX: number,
    centerY: number,
    scale: number,
    offsetX: number,
    offsetY: number,
  ) => void;
  "camera:clicked": (globalX: number, globalY: number) => void;
}

export class PixiCameraController {
  private app: Application;
  private state: AppState;
  private renderCallback: () => void;
  private eventBus: EventBus<EventMap>;

  private dragging = false;
  private lastPointerPos = { x: 0, y: 0 };
  private cumulativeDragDistance = 0;
  private dragThreshold = 20;

  // For pinch zoom
  private activePointers: Map<number, { x: number; y: number }> = new Map();
  private initialPinchDistance: number | null = null;
  private initialPinchScale: number | null = null;
  private initialPinchCenter: { x: number; y: number } | null = null;

  constructor(
    app: Application,
    state: AppState,
    renderCallback: () => void,
    eventBus: EventBus<EventMap>,
  ) {
    this.app = app;
    this.state = state;
    this.renderCallback = renderCallback;
    this.eventBus = eventBus;

    this.app.stage.on("pointerdown", this.onPointerDown, this);
    this.app.stage.on("pointermove", this.onPointerMove, this);
    this.app.stage.on("pointerup", this.onPointerUp, this);
    this.app.stage.on("pointerupoutside", this.onPointerUp, this);

    this.app.canvas.addEventListener("wheel", (e) => this.onWheel(e), {
      passive: false,
    });
  }

  private onPointerDown(e: FederatedPointerEvent) {
    this.activePointers.set(e.pointerId, { x: e.global.x, y: e.global.y });
    if (this.activePointers.size === 1) {
      // Single pointer: start dragging
      this.dragging = true;
      this.lastPointerPos = { x: e.global.x, y: e.global.y };
      this.cumulativeDragDistance = 0;
    } else if (this.activePointers.size === 2) {
      // Two fingers: start pinch
      this.initializePinch();
    }
  }

  private onPointerMove(e: FederatedPointerEvent) {
    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, { x: e.global.x, y: e.global.y });
    }

    if (this.activePointers.size === 1 && this.dragging) {
      // Dragging with single pointer
      const dx = e.global.x - this.lastPointerPos.x;
      const dy = e.global.y - this.lastPointerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      this.cumulativeDragDistance += dist;

      this.state.offset.x -= dx / this.state.cameraScale;
      this.state.offset.y -= dy / this.state.cameraScale;

      this.lastPointerPos = { x: e.global.x, y: e.global.y };
      this.renderCallback();
      this.emitCameraMoved();
    } else if (
      this.activePointers.size === 2 &&
      this.initialPinchDistance !== null
    ) {
      // Pinch to zoom
      this.handlePinch();
    }
  }

  private onPointerUp(e: FederatedPointerEvent) {
    this.activePointers.delete(e.pointerId);

    if (this.activePointers.size === 0) {
      // No pointers left
      if (this.dragging) {
        this.dragging = false;
        if (this.cumulativeDragDistance < this.dragThreshold) {
          // This is a click
          this.eventBus.emit("camera:clicked", e.global.x, e.global.y);
        }
      }
      this.initialPinchDistance = null;
      this.initialPinchScale = null;
      this.initialPinchCenter = null;
    } else if (this.activePointers.size === 1) {
      // Back to single pointer mode
      this.initialPinchDistance = null;
      this.initialPinchScale = null;
      this.initialPinchCenter = null;
    }
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();

    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;

    // Mouse position relative to the canvas
    const rect = this.app.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert mouse pos to world coords before zoom
    const worldXBefore = this.state.offset.x + mouseX / this.state.cameraScale;
    const worldYBefore = this.state.offset.y + mouseY / this.state.cameraScale;

    // Update scale
    const newScale = Math.min(
      Math.max(this.state.cameraScale + zoomDelta, 0.5),
      3,
    );
    if (newScale !== this.state.cameraScale) {
      this.state.cameraScale = newScale;
      // Adjust offset so worldXBefore, worldYBefore stays under the mouse
      this.state.offset.x = worldXBefore - mouseX / this.state.cameraScale;
      this.state.offset.y = worldYBefore - mouseY / this.state.cameraScale;

      this.renderCallback();
      this.emitCameraMoved();
    }
  }

  private initializePinch() {
    if (this.activePointers.size === 2) {
      const pts = Array.from(this.activePointers.values());
      const [p1, p2] = pts;
      const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
      this.initialPinchDistance = dist;
      this.initialPinchScale = this.state.cameraScale;

      // Find midpoint in screen coords
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      // Convert midpoint to world coords
      const worldX = this.state.offset.x + midX / this.state.cameraScale;
      const worldY = this.state.offset.y + midY / this.state.cameraScale;
      this.initialPinchCenter = { x: worldX, y: worldY };
    }
  }

  private handlePinch() {
    if (
      this.activePointers.size === 2 &&
      this.initialPinchDistance !== null &&
      this.initialPinchScale !== null &&
      this.initialPinchCenter !== null
    ) {
      const pts = Array.from(this.activePointers.values());
      const [p1, p2] = pts;
      const newDist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);

      const scaleFactor = newDist / (this.initialPinchDistance || 1);
      const newScale = Math.min(
        Math.max(this.initialPinchScale * scaleFactor, 0.5),
        3,
      );

      if (newScale !== this.state.cameraScale) {
        // Zoom around initialPinchCenter
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        const worldXBefore = this.initialPinchCenter.x;
        const worldYBefore = this.initialPinchCenter.y;

        this.state.cameraScale = newScale;
        // Adjust offset so that worldXBefore, worldYBefore is still at midpoint of two touches
        this.state.offset.x = worldXBefore - midX / this.state.cameraScale;
        this.state.offset.y = worldYBefore - midY / this.state.cameraScale;

        this.renderCallback();
        this.emitCameraMoved();
      }
    }
  }

  private emitCameraMoved() {
    const centerX =
      this.state.offset.x +
      this.app.renderer.width / (2 * this.state.cameraScale);
    const centerY =
      this.state.offset.y +
      this.app.renderer.height / (2 * this.state.cameraScale);
    this.eventBus.emit(
      "camera:moved",
      centerX,
      centerY,
      this.state.cameraScale,
      this.state.offset.x,
      this.state.offset.y,
    );
  }

  centerOnTile(tileX: number, tileY: number, tileSize: number) {
    const GRID_SIZE = 50;
    const view = this.app.renderer.screen;
    this.state.offset.x =
      tileX * GRID_SIZE +
      (tileSize * GRID_SIZE) / 2 -
      view.width / (2 * this.state.cameraScale);
    this.state.offset.y =
      tileY * GRID_SIZE +
      (tileSize * GRID_SIZE) / 2 -
      view.height / (2 * this.state.cameraScale);
    this.renderCallback();
    this.emitCameraMoved();
  }
}
