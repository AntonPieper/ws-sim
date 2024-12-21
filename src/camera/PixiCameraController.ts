// src/camera/PixiCameraController.ts

import { Application, FederatedPointerEvent } from "pixi.js";
import { EventBus } from "../EventBus";
import { CameraState } from "../data/types";
import { CameraEvents } from "../data/events";
import { Scene } from "../Scene";
import {
  CLICK_THRESHOLD,
  MAX_ZOOM,
  MIN_ZOOM,
  PAN_SPEED,
  ZOOM_SPEED,
} from "../data/constants";

interface PointerData {
  // For detecting clicks vs. drags
  startX: number;
  startY: number;
  totalDragDistance: number;

  // Old position (previous frame)
  prevX: number;
  prevY: number;

  // Current position (this frame)
  x: number;
  y: number;
}

export class PixiCameraController {
  /**
   * Track active pointer(s). Key = pointerId.
   * Allows multi-touch for pinch-zoom + panning,
   * or single-pointer for just panning.
   */
  private pointers = new Map<number, PointerData>();

  constructor(
    private app: Application,
    private camera: CameraState,
    private eventBus: EventBus<CameraEvents>,
    private scene: Scene
  ) {
    this.setupEvents();
  }

  private setupEvents() {
    this.eventBus.on("camera:move", (updatedCamera: CameraState) => {
      // Copy the provided camera offsets/zoom into ours
      this.camera.offset.x = updatedCamera.offset.x;
      this.camera.offset.y = updatedCamera.offset.y;
      this.camera.scale = updatedCamera.scale;
      this.eventBus.emit("camera:moved", this.camera);
    });

    // ----------------------------------------------------------------
    // Pointer Down
    // ----------------------------------------------------------------
    this.app.stage.on("pointerdown", (event: FederatedPointerEvent) => {
      const pointerId = event.pointerId ?? 0;
      const { x, y } = event.global;

      this.pointers.set(pointerId, {
        startX: x,
        startY: y,
        totalDragDistance: 0,

        // At start, prevX/prevY = current x,y
        prevX: x,
        prevY: y,

        // Current position
        x,
        y,
      });
    });

    // ----------------------------------------------------------------
    // Pointer Move
    // ----------------------------------------------------------------
    this.app.stage.on("pointermove", (event: FederatedPointerEvent) => {
      const pointerId = event.pointerId ?? 0;
      if (!this.pointers.has(pointerId)) return;

      const pd = this.pointers.get(pointerId)!;

      // Move old->prev, current->x,y
      // 1) shift prev => current
      pd.prevX = pd.x;
      pd.prevY = pd.y;

      // 2) update new positions
      pd.x = event.global.x;
      pd.y = event.global.y;

      // Accumulate for click vs. drag detection
      const moveDist = Math.hypot(pd.x - pd.prevX, pd.y - pd.prevY);
      pd.totalDragDistance += moveDist;

      // Now figure out if we have 1 pointer or 2+ pointers
      if (this.pointers.size === 1) {
        // Single pointer => Pan only
        const deltaX = pd.x - pd.prevX;
        const deltaY = pd.y - pd.prevY;
        this.panSinglePointer(deltaX, deltaY);
      } else {
        // 2 or more pointers => pinch & pan simultaneously
        this.handlePinchAndPan();
      }
    });

    // ----------------------------------------------------------------
    // Pointer Up / Cancel
    // ----------------------------------------------------------------
    this.app.stage.on("pointerup", (event) => this.handlePointerUp(event));
    this.app.stage.on("pointerupoutside", (event) =>
      this.handlePointerUp(event)
    );
    this.app.stage.on("pointercancel", (event) => this.handlePointerUp(event));

    // ----------------------------------------------------------------
    // Mouse Wheel => Zoom around cursor
    // ----------------------------------------------------------------
    this.app.stage.on(
      "wheel",
      (event) => {
        event.preventDefault(); // prevent page scroll
        const zoomDelta = event.deltaY < 0 ? 1 + ZOOM_SPEED : 1 - ZOOM_SPEED;
        this.applyZoom(zoomDelta, event.global.x, event.global.y);
      },
      { passive: false }
    );
  }

  // ----------------------------------------------------------------
  // Single Pointer Pan
  // ----------------------------------------------------------------
  private panSinglePointer(deltaX: number, deltaY: number) {
    this.camera.offset.x -= (deltaX / this.camera.scale) * PAN_SPEED;
    this.camera.offset.y -= (deltaY / this.camera.scale) * PAN_SPEED;
    this.eventBus.emit("camera:move", this.camera);
  }

  // ----------------------------------------------------------------
  // Multi-pointer Pinch + Pan
  // ----------------------------------------------------------------
  /**
   * We compute the old & new midpoint for panning,
   * plus the old & new distances for zooming.
   */
  private handlePinchAndPan() {
    if (this.pointers.size < 2) return;

    // Just use the first two pointers in the Map for pinch.
    // (If you want to handle 3+ pointers, you'd do something more advanced here.)
    const [p1, p2] = Array.from(this.pointers.values());

    // 1) Old midpoint & new midpoint
    const oldMidX = (p1.prevX + p2.prevX) / 2;
    const oldMidY = (p1.prevY + p2.prevY) / 2;
    const newMidX = (p1.x + p2.x) / 2;
    const newMidY = (p1.y + p2.y) / 2;

    // 2) Pan => how much did the midpoint move?
    const midMoveX = newMidX - oldMidX;
    const midMoveY = newMidY - oldMidY;

    // Convert that midpoint movement into world space.
    this.camera.offset.x -= (midMoveX / this.camera.scale) * PAN_SPEED;
    this.camera.offset.y -= (midMoveY / this.camera.scale) * PAN_SPEED;

    // 3) Pinch (zoom) => ratio of newDist / oldDist
    const oldDist = this.distance(p1.prevX, p1.prevY, p2.prevX, p2.prevY);
    const newDist = this.distance(p1.x, p1.y, p2.x, p2.y);

    if (oldDist > 0 && newDist > 0) {
      const zoomFactor = newDist / oldDist;
      // Zoom around the *new* midpoint
      this.applyZoom(zoomFactor, newMidX, newMidY);
    } else {
      // If oldDist/newDist are 0, we can't pinch, but we still panned above.
      this.eventBus.emit("camera:move", this.camera);
    }
  }

  // ----------------------------------------------------------------
  // Pointer Up => Possibly a Click
  // ----------------------------------------------------------------
  private handlePointerUp(event: FederatedPointerEvent) {
    const pointerId = event.pointerId ?? 0;
    if (!this.pointers.has(pointerId)) return;

    const pd = this.pointers.get(pointerId)!;

    // If we only had one pointer, check for click
    if (this.pointers.size === 1) {
      if (pd.totalDragDistance < CLICK_THRESHOLD) {
        // It's effectively a "click"
        this.eventBus.emit("camera:click", pd.x, pd.y);
      }
    }

    // Remove pointer
    this.pointers.delete(pointerId);
    this.eventBus.emit("camera:move", this.camera);
  }

  // ----------------------------------------------------------------
  // Zoom Around a Screen Pivot
  // ----------------------------------------------------------------
  private applyZoom(zoomFactor: number, pivotX: number, pivotY: number) {
    const oldScale = this.camera.scale;
    let newScale = oldScale * zoomFactor;
    newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));

    if (newScale !== oldScale) {
      // Convert screen coords to world coords before adjusting scale
      const worldBefore = this.scene.screenToWorld({ x: pivotX, y: pivotY });

      // Update the camera scale
      this.camera.scale = newScale;

      // Convert screen coords to world coords after adjusting scale
      const worldAfter = this.scene.screenToWorld({ x: pivotX, y: pivotY });

      // Shift offset so the map doesn't "jump" under the pointer
      this.camera.offset.x += worldBefore.x - worldAfter.x;
      this.camera.offset.y += worldBefore.y - worldAfter.y;
    }

    this.eventBus.emit("camera:move", this.camera);
  }

  private distance(x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
