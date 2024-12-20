import { Application, FederatedPointerEvent } from "pixi.js";
import { EventBus } from "../EventBus";
import { CameraEvents } from "../data/events";
import { CameraState, Position } from "../data/types";
import { CLICK_THRESHOLD, ZOOM_MAX, ZOOM_MIN } from "../data/constants";
import { Scene } from "../Scene";

export class PixiCameraController {
  private state: CameraState;

  // Touch handling
  private activePointers: Map<number, Position>;
  private lastTouchCenter: Position | null;
  private lastTouchDistance: number | null;

  // Panning
  private isPanning: boolean;
  private panStart: Position | null;
  private initialPanStart: Position | null; // Added to track initial pan position

  constructor(
    private app: Application,
    initialState: CameraState,
    private eventBus: EventBus<CameraEvents>,
    private scene: Scene
  ) {
    this.state = initialState;

    this.activePointers = new Map();
    this.lastTouchCenter = null;
    this.lastTouchDistance = null;

    this.isPanning = false;
    this.panStart = null;
    this.initialPanStart = null; // Initialize initialPanStart

    this.eventBus.on("camera:moved", (state) => {
      this.state.offset.x = state.offset.x;
      this.state.offset.y = state.offset.y;
      this.state.scale = state.scale;
    });

    this.setupEvents();
  }

  private setupEvents() {
    this.app.stage.interactive = true;
    this.app.stage.on("pointerdown", this.onPointerDown, this);
    this.app.stage.on("pointermove", this.onPointerMove, this);
    this.app.stage.on("pointerup", this.onPointerUp, this);
    this.app.stage.on("pointerupoutside", this.onPointerUp, this);
    this.app.stage.on("pointercancel", this.onPointerUp, this);

    // Wheel for zooming (optional)
    this.app.canvas.addEventListener("wheel", this.onWheel.bind(this));
  }

  private onPointerDown(event: FederatedPointerEvent) {
    const screenPosition = { x: event.global.x, y: event.global.y };
    const worldPosition = this.scene.screenToWorld(screenPosition);
    this.activePointers.set(event.pointerId, worldPosition);

    if (this.activePointers.size === 1) {
      // Start panning with world coordinates
      this.isPanning = true;
      this.panStart = { ...worldPosition };
      this.initialPanStart = { ...worldPosition };
    } else if (this.activePointers.size === 2) {
      // Start pinch zoom
      const points = Array.from(this.activePointers.values());
      this.lastTouchCenter = getCenter(points[0], points[1]);
      this.lastTouchDistance = getDistance(points[0], points[1]);

      // Reset panning state since we're now pinching
      this.isPanning = false;
      this.panStart = null;
      this.initialPanStart = null;
    }
  }

  private onPointerMove(event: FederatedPointerEvent) {
    if (!this.activePointers.has(event.pointerId)) return;

    const screenPosition = { x: event.global.x, y: event.global.y };
    const worldPosition = this.scene.screenToWorld(screenPosition);
    this.activePointers.set(event.pointerId, worldPosition);

    if (this.activePointers.size === 1 && this.isPanning && this.panStart) {
      const pointer = Array.from(this.activePointers.values())[0];
      const delta = {
        x: pointer.x - this.panStart.x,
        y: pointer.y - this.panStart.y,
      };
      this.pan(delta.x, delta.y);
      this.panStart = { ...pointer };
    } else if (this.activePointers.size === 2) {
      const points = Array.from(this.activePointers.values());
      const currentCenter = getCenter(points[0], points[1]);
      const currentDistance = getDistance(points[0], points[1]);

      if (this.lastTouchCenter !== null && this.lastTouchDistance !== null) {
        // Calculate the scale factor
        const scaleFactor = currentDistance / this.lastTouchDistance;

        // Update scale
        this.zoom(scaleFactor, currentCenter.x, currentCenter.y);

        // Calculate the movement of the center
        const deltaCenter = {
          x: currentCenter.x - this.lastTouchCenter.x,
          y: currentCenter.y - this.lastTouchCenter.y,
        };
        this.pan(deltaCenter.x, deltaCenter.y);
      }

      // Update last positions
      this.lastTouchCenter = currentCenter;
      this.lastTouchDistance = currentDistance;
    }
  }

  private onPointerUp(event: FederatedPointerEvent) {
    const screenPosition = { x: event.global.x, y: event.global.y };
    const worldPosition = this.scene.screenToWorld(screenPosition);
    this.activePointers.delete(event.pointerId);

    if (this.activePointers.size < 2) {
      this.lastTouchCenter = null;
      this.lastTouchDistance = null;
    }

    if (this.activePointers.size === 1) {
      const remainingPoint = Array.from(this.activePointers.values())[0];
      this.isPanning = true;
      this.panStart = { ...remainingPoint };
      this.initialPanStart = { ...remainingPoint };
    } else {
      if (this.isPanning && this.initialPanStart) {
        const distance = getDistance(this.initialPanStart, worldPosition);
        if (distance < CLICK_THRESHOLD) {
          this.eventBus.emit("camera:click", worldPosition.x, worldPosition.y);
        }
      }

      this.isPanning = false;
      this.panStart = null;
      this.initialPanStart = null;
    }
  }

  private onWheel(event: WheelEvent) {
    event.preventDefault();

    const scaleAmount = 1 + 0.05 * (event.deltaY > 0 ? -1 : 1);
    const mousePos = { x: event.offsetX, y: event.offsetY };
    this.zoom(scaleAmount, mousePos.x, mousePos.y);
  }

  private pan(deltaX: number, deltaY: number) {
    const newState = { ...this.state };
    newState.offset.x -= deltaX / this.state.scale;
    newState.offset.y -= deltaY / this.state.scale;
    this.eventBus.emit("camera:moved", newState);
  }

  private zoom(scaleFactor: number, centerX: number, centerY: number) {
    const newState = { ...this.state };
    // Limit zoom levels
    const newScale = Math.min(
      Math.max(ZOOM_MIN, this.state.scale * scaleFactor),
      ZOOM_MAX
    );

    // Calculate world position before zoom
    const worldPosBefore = {
      x: centerX / this.state.scale + this.state.offset.x,
      y: centerY / this.state.scale + this.state.offset.y,
    };

    newState.scale = newScale;

    // Calculate world position after zoom
    const worldPosAfter = {
      x: centerX / newState.scale + this.state.offset.x,
      y: centerY / newState.scale + this.state.offset.y,
    };

    // Adjust offset to keep the zoom centered
    newState.offset.x += worldPosBefore.x - worldPosAfter.x;
    newState.offset.y += worldPosBefore.y - worldPosAfter.y;

    this.eventBus.emit("camera:moved", newState);
  }
}

function getCenter(p1: Position, p2: Position): Position {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

function getDistance(p1: Position, p2: Position): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}
