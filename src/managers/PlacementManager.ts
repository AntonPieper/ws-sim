import { AppState } from "../data/AppState";
import {
  CameraEvents,
  ConfigEvents,
  TileEvents,
  ToolEvents,
} from "../data/events";
import { SelectedTool, Tile } from "../data/types";
import { EventBus } from "../EventBus";
import { Scene } from "../Scene";
import { PlacementControls } from "../ui/PlacementControls";
import { createKey } from "../utils/utils";

interface PlacementEvents
  extends CameraEvents,
    ToolEvents,
    TileEvents,
    ConfigEvents {}

export class PlacementManager {
  private occupiedMap = new Map<string, Tile>();

  constructor(
    private state: AppState,
    private scene: Scene,
    private placementControls: PlacementControls,
    private renderCallback: () => void,
    private eventBus: EventBus<PlacementEvents>,
  ) {
    this.rebuildOccupiedMap();

    this.eventBus.on("camera:click", this.onCameraClicked.bind(this));
    this.eventBus.on("camera:moved", this.onCameraMoved.bind(this));
    this.eventBus.on("tool:select", this.startPlacementMode.bind(this));
    this.eventBus.on("config:loaded", this.rebuildOccupiedMap.bind(this));
  }

  private rebuildOccupiedMap(): void {
    this.occupiedMap.clear();
    for (const tile of this.state.placedTiles) {
      this.addTileToMap(tile);
    }
  }

  private addTileToMap(tile: Tile): void {
    for (let dx = 0; dx < tile.size; dx++) {
      for (let dy = 0; dy < tile.size; dy++) {
        const key = createKey(tile.x + dx, tile.y + dy);
        this.occupiedMap.set(key, tile);
      }
    }
  }

  private removeTileFromMap(tile: Tile): void {
    for (let dx = 0; dx < tile.size; dx++) {
      for (let dy = 0; dy < tile.size; dy++) {
        const cellKey = createKey(tile.x + dx, tile.y + dy);
        if (this.occupiedMap.get(cellKey) === tile) {
          // Only remove if it’s the same tile (in case of collisions)
          this.occupiedMap.delete(cellKey);
        }
      }
    }
  }

  public startPlacementMode(toolSelected: SelectedTool) {
    this.state.selectedTool.type = toolSelected.type;
    this.state.selectedTool.size = toolSelected.size;
    if (toolSelected.type !== "eraser") {
      this.state.isInPlacementMode = true;
      this.updatePreviewTilePosition();
      this.placementControls.show(this.canPlaceTile(this.state.previewTile), {
        name: this.state.previewTile?.customName,
        onConfirm: () => this.finalizePlacement(),
        onCancel: () => this.cancelPlacementMode(),
        onNameChange: (newName) => {
          if (this.state.previewTile) {
            this.state.previewTile.customName = newName;
            this.renderCallback();
          }
        },
      });
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
    const preview = this.state.previewTile;
    if (!preview) return;
    if (this.canPlaceTile(preview)) {
      const placedTile = { ...preview };

      // Update the arrays + map
      this.state.placedTiles.push(placedTile);
      this.addTileToMap(placedTile);

      this.eventBus.emit("tile:placed", placedTile);

      this.cancelPlacementMode();
    }
  }

  private canPlaceTile(tile: Tile | null): boolean {
    if (!tile) return false;

    // Check each cell inside tile bounds
    for (let dx = 0; dx < tile.size; dx++) {
      for (let dy = 0; dy < tile.size; dy++) {
        const cellKey = createKey(tile.x + dx, tile.y + dy);
        // If the cell is already occupied, can't place
        if (this.occupiedMap.has(cellKey)) {
          return false;
        }
      }
    }
    return true;
  }

  private onCameraClicked(screenX: number, screenY: number) {
    if (!this.state.isInPlacementMode) {
      // Attempt to pick up an existing tile
      const pos = this.scene.screenToTile({ x: screenX, y: screenY });
      const clickedTile = this.occupiedMap.get(
        createKey(Math.floor(pos.x), Math.floor(pos.y)),
      );
      if (clickedTile && clickedTile.type !== "eraser") {
        // Remove from placedTiles + map
        this.removeTileFromMap(clickedTile);
        const index = this.state.placedTiles.indexOf(clickedTile);
        if (index >= 0) {
          this.state.placedTiles.splice(index, 1);

          this.eventBus.emit("tile:removed", clickedTile);
        }

        // Turn it into a preview tile
        this.state.selectedTool.type = clickedTile.type;
        this.state.selectedTool.size = clickedTile.size;
        this.state.isInPlacementMode = true;
        this.state.previewTile = { ...clickedTile };

        // Show the controls
        this.placementControls.show(this.canPlaceTile(this.state.previewTile), {
          name: this.state.previewTile?.customName,
          onConfirm: () => this.finalizePlacement(),
          onCancel: () => this.cancelPlacementMode(),
          onNameChange: (newName) => {
            if (this.state.previewTile) {
              this.state.previewTile.customName = newName;
              this.renderCallback();
            }
          },
        });

        // Emit events
        this.eventBus.emit("tool:select", this.state.selectedTool);
        // Move camera to the tile’s position
        const sin = Math.sin(-Math.PI / 4);
        const cos = Math.cos(-Math.PI / 4);
        const position = {
          x: clickedTile.x + clickedTile.size / 2,
          y: clickedTile.y + clickedTile.size / 2,
        };
        const cameraOffset = {
          x: position.x * cos - position.y * sin,
          y: position.x * sin + position.y * cos,
        };
        this.eventBus.emit("camera:move", {
          offset: this.scene.tileToWorld(cameraOffset),
          scale: this.state.camera.scale,
        });
        this.renderCallback();
      }
    } else {
      // If in placement mode, you can optionally auto-place on click, or do nothing
    }
  }

  private onCameraMoved() {
    if (this.state.isInPlacementMode) {
      this.updatePreviewTilePosition();
    }
  }

  private updatePreviewTilePosition() {
    if (!this.state.isInPlacementMode || !this.state.selectedTool.type) {
      return;
    }

    const { offset } = this.state.camera;
    const sin = Math.sin(Math.PI / 4);
    const cos = Math.cos(Math.PI / 4);
    const cameraOffset = {
      x: offset.x * cos - offset.y * sin,
      y: offset.x * sin + offset.y * cos,
    };

    const position = this.scene.worldToTile(cameraOffset);
    const gx = Math.round(position.x - this.state.selectedTool.size / 2);
    const gy = Math.round(position.y - this.state.selectedTool.size / 2);

    this.state.previewTile ??= {
      x: gx,
      y: gy,
      size: this.state.selectedTool.size,
      type: this.state.selectedTool.type,
      customName: "",
    };
    this.state.previewTile.x = gx;
    this.state.previewTile.y = gy;
    this.state.previewTile.size = this.state.selectedTool.size;
    this.state.previewTile.type = this.state.selectedTool.type;

    this.placementControls.updateConfirmState(
      this.canPlaceTile(this.state.previewTile),
    );
    this.renderCallback();
  }
}
