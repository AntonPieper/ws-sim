import { AppState } from "../data/AppState";
import { Scene } from "../Scene";
import { PlacementControls } from "../ui/PlacementControls";
import { SelectedTool, Tile } from "../data/types";
import { GRID_SIZE } from "../data/constants";
import { EventBus } from "../EventBus";
import { CameraEvents, ToolEvents } from "../data/events";

interface PlacementEvents extends CameraEvents, ToolEvents {}

export class PlacementManager {
  private state: AppState;
  private scene: Scene;
  private placementControls: PlacementControls;
  private renderCallback: () => void;
  private eventBus: EventBus<PlacementEvents>;

  constructor(
    state: AppState,
    scene: Scene,
    placementControls: PlacementControls,
    renderCallback: () => void,
    eventBus: EventBus<PlacementEvents>
  ) {
    this.state = state;
    this.scene = scene;
    this.placementControls = placementControls;
    this.renderCallback = renderCallback;
    this.eventBus = eventBus;

    this.eventBus.on("camera:click", this.onCameraClicked.bind(this));
    this.eventBus.on("camera:moved", this.onCameraMoved.bind(this));
    this.eventBus.on("tool:select", this.startPlacementMode.bind(this));
  }

  startPlacementMode(toolSelected: SelectedTool) {
    this.state.selectedTool = toolSelected;
    if (toolSelected.type !== "eraser") {
      this.state.isInPlacementMode = true;
      this.updatePreviewTilePosition();
      this.placementControls.show(
        this.canPlaceTile(this.state.previewTile),
        () => this.finalizePlacement(),
        () => this.cancelPlacementMode()
      );
      this.renderCallback();
    } else {
      this.cancelPlacementMode();
    }
  }

  private cancelPlacementMode() {
    this.state.isInPlacementMode = false;
    this.state.previewTile = null;
    this.placementControls.hide();
    this.renderCallback();
  }

  private finalizePlacement() {
    if (this.state.previewTile && this.canPlaceTile(this.state.previewTile)) {
      const placedTile = { ...this.state.previewTile };
      if (placedTile.type === "bear_trap") {
        this.state.bearTrapPosition = {
          x: placedTile.x + placedTile.size / 2,
          y: placedTile.y + placedTile.size / 2,
        };
      }
      this.state.placedTiles.push(placedTile);
      this.cancelPlacementMode();
    }
  }

  private canPlaceTile(tile: Tile | null): boolean {
    if (!tile) return false;
    return !this.state.placedTiles.some(
      (existing) =>
        tile.x < existing.x + existing.size &&
        tile.x + tile.size > existing.x &&
        tile.y < existing.y + existing.size &&
        tile.y + tile.size > existing.y
    );
  }

  private onCameraClicked(screenX: number, screenY: number) {
    if (!this.state.isInPlacementMode) {
      const pos = this.scene.screenToTile({
        x: screenX,
        y: screenY,
      });

      const clickedTileIndex = this.findTileAt(pos.x, pos.y);
      const clickedTile = this.popTile(clickedTileIndex);
      if (clickedTile && clickedTile.type !== "eraser") {
        this.state.selectedTool = {
          type: clickedTile.type,
          size: clickedTile.size,
        };
        this.state.isInPlacementMode = true;
        this.eventBus.emit("tool:select", {
          type: clickedTile.type,
          size: clickedTile.size,
        });

        this.state.previewTile = { ...clickedTile };
        console.log(clickedTile);
        this.eventBus.emit("camera:moved", {
          offset: this.scene.tileToScreen({
            x: clickedTile.x + clickedTile.size / 2,
            y: clickedTile.y + clickedTile.size / 2,
          }),
          scale: this.state.camera.scale,
        });
        this.renderCallback();
      }
    } else {
      // Possibly finalize placement or other logic if needed
    }
  }

  private onCameraMoved() {
    if (this.state.isInPlacementMode) {
      this.updatePreviewTilePosition();
    }
  }

  private updatePreviewTilePosition() {
    if (!this.state.isInPlacementMode || !this.state.selectedTool.type) return;

    const centerX = this.state.camera.offset.x;
    const centerY = this.state.camera.offset.y;
    const gx = Math.round(
      centerX / GRID_SIZE - this.state.selectedTool.size / 2
    );
    const gy = Math.round(
      centerY / GRID_SIZE - this.state.selectedTool.size / 2
    );

    this.state.previewTile = {
      x: gx,
      y: gy,
      type: this.state.selectedTool.type,
      size: this.state.selectedTool.size,
    };

    this.placementControls.updateConfirmState(
      this.canPlaceTile(this.state.previewTile)
    );
    this.renderCallback();
  }

  private findTileAt(gx: number, gy: number): number {
    return this.state.placedTiles.findIndex(
      (tile) =>
        gx >= tile.x &&
        gx < tile.x + tile.size &&
        gy >= tile.y &&
        gy < tile.y + tile.size
    );
  }

  private popTile(index: number): Tile | null {
    if (index < 0 || index >= this.state.placedTiles.length) {
      return null;
    }
    return this.state.placedTiles.splice(index, 1)[0];
  }
}
