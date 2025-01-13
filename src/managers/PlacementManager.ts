import { AppState } from "../data/AppState";
import { GRID_SIZE } from "../data/constants";
import { CameraEvents, ToolEvents } from "../data/events";
import { SelectedTool, Tile } from "../data/types";
import { EventBus } from "../EventBus";
import { Scene } from "../Scene";
import { PlacementControls } from "../ui/PlacementControls";
import { createKey } from "../utils/utils";

interface PlacementEvents extends CameraEvents, ToolEvents {}

export class PlacementManager {
  private eventBus: EventBus<PlacementEvents>;
  private placementControls: PlacementControls;
  private renderCallback: () => void;
  private scene: Scene;
  private state: AppState;

  // Optional Spatial Index: A map of string -> Tile reference
  // key is `x,y` for each occupied cell
  private occupiedMap = new Map<string, Tile>();

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

    // Build initial map
    this.rebuildOccupiedMap();

    this.eventBus.on("camera:click", this.onCameraClicked.bind(this));
    this.eventBus.on("camera:moved", this.onCameraMoved.bind(this));
    this.eventBus.on("tool:select", this.startPlacementMode.bind(this));
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
        const cellKey = createKey(tile.x + dx, tile.y + dy);
        this.occupiedMap.set(cellKey, tile);
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
    const preview = this.state.previewTile;
    if (!preview) return;
    if (this.canPlaceTile(preview)) {
      const placedTile = { ...preview };

      // If bear_trap, record
      if (placedTile.type === "bear_trap") {
        this.state.bearTrapPosition = {
          x: placedTile.x + placedTile.size / 2,
          y: placedTile.y + placedTile.size / 2,
        };
      }

      // Update the arrays + map
      this.state.placedTiles.push(placedTile);
      this.addTileToMap(placedTile);

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
      // Trying to pick up or remove an existing tile
      const pos = this.scene.screenToTile({ x: screenX, y: screenY });
      const clickedTile = this.occupiedMap.get(
        createKey(Math.floor(pos.x), Math.floor(pos.y))
      );

      // If there’s a tile and not eraser
      if (clickedTile && clickedTile.type !== "eraser") {
        this.handleTilePickUp(clickedTile);
      }
    } else {
      // Possibly finalize placement if you want click-to-place
      // (Currently we require the confirm button to finalize)
    }
  }

  private handleTilePickUp(clickedTile: Tile) {
    // Remove from map + array
    this.removeTileFromMap(clickedTile);
    const index = this.state.placedTiles.indexOf(clickedTile);
    if (index >= 0) {
      this.state.placedTiles.splice(index, 1);
    }

    // Turn that tile into the selected tool
    this.state.selectedTool = {
      type: clickedTile.type,
      size: clickedTile.size,
    };
    this.state.isInPlacementMode = true;
    this.state.previewTile = { ...clickedTile };

    // Emit so Toolbox shows the new selection
    this.eventBus.emit("tool:select", {
      type: clickedTile.type,
      size: clickedTile.size,
    });

    console.log("Picked up tile", clickedTile);

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
    // Center tile on camera offset
    const position = this.scene.worldToTile(cameraOffset);
    const gx = Math.round(position.x - this.state.selectedTool.size / 2);
    const gy = Math.round(position.y - this.state.selectedTool.size / 2);

    this.state.previewTile = {
      x: gx,
      y: gy,
      type: this.state.selectedTool.type,
      size: this.state.selectedTool.size,
    };

    // Check if it can be placed
    this.placementControls.updateConfirmState(
      this.canPlaceTile(this.state.previewTile)
    );
    this.renderCallback();
  }
}
