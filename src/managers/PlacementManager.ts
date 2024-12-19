import { AppState } from "../data/AppState";
import { Scene } from "../Scene";
import { PlacementControls } from "../ui/PlacementControls";
import { Tile, TileType } from "../data/types";
import { GRID_SIZE } from "../data/constants";
import { EventBus } from "../EventBus";

interface EventMap {
  "camera:moved": () => void;
  "camera:clicked": (globalX: number, globalY: number) => void;
  "tool:selected": (type: TileType | null, size: number) => void;
}

export class PlacementManager {
  private state: AppState;
  private scene: Scene;
  private placementControls: PlacementControls;
  private renderCallback: () => void;
  private eventBus: EventBus<EventMap>;

  private cameraController!: {
    centerOnTile: (tileX: number, tileY: number, tileSize: number) => void;
  };
  private toolbox!: {
    selectToolProgrammatically: (type: TileType, size: number) => void;
  };

  constructor(
    state: AppState,
    scene: Scene,
    placementControls: PlacementControls,
    renderCallback: () => void,
    eventBus: EventBus<EventMap>,
  ) {
    this.state = state;
    this.scene = scene;
    this.placementControls = placementControls;
    this.renderCallback = renderCallback;
    this.eventBus = eventBus;

    this.eventBus.on("camera:clicked", this.onCameraClicked.bind(this));
    this.eventBus.on("camera:moved", this.onCameraMoved.bind(this));
  }

  public setCameraController(cameraController: {
    centerOnTile: (tileX: number, tileY: number, tileSize: number) => void;
  }) {
    this.cameraController = cameraController;
  }

  public setToolbox(toolbox: {
    selectToolProgrammatically: (type: TileType, size: number) => void;
  }) {
    this.toolbox = toolbox;
  }

  startPlacementMode(toolSelected: { type: TileType | null; size: number }) {
    this.state.selectedTool = toolSelected;
    if (toolSelected.type !== "eraser") {
      this.state.isInPlacementMode = true;
      this.updatePreviewTilePosition();
      this.placementControls.show(
        this.canPlaceTile(this.state.previewTile),
        () => this.finalizePlacement(),
        () => this.cancelPlacementMode(),
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
        tile.y + tile.size > existing.y,
    );
  }

  private onCameraClicked(globalX: number, globalY: number) {
    if (!this.state.isInPlacementMode) {
      const localPos = this.scene["cameraContainer"].toLocal({
        x: globalX,
        y: globalY,
      });
      const gx = Math.floor(localPos.x / GRID_SIZE);
      const gy = Math.floor(localPos.y / GRID_SIZE);

      const clickedTileIndex = this.findTileAt(gx, gy);
      const clickedTile = this.popTile(clickedTileIndex);
      if (clickedTile && clickedTile.type !== "eraser") {
        this.state.selectedTool = {
          type: clickedTile.type,
          size: clickedTile.size,
        };
        this.toolbox.selectToolProgrammatically(
          clickedTile.type,
          clickedTile.size,
        );

        this.state.isInPlacementMode = true;
        this.state.previewTile = { ...clickedTile };

        this.cameraController.centerOnTile(
          clickedTile.x,
          clickedTile.y,
          clickedTile.size,
        );

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

    const view = this.scene["app"].renderer.screen;
    const centerX =
      view.width / 2 / this.state.cameraScale + this.state.offset.x;
    const centerY =
      view.height / 2 / this.state.cameraScale + this.state.offset.y;
    const gx = Math.floor(
      centerX / GRID_SIZE - this.state.selectedTool.size / 2,
    );
    const gy = Math.floor(
      centerY / GRID_SIZE - this.state.selectedTool.size / 2,
    );

    this.state.previewTile = {
      x: gx,
      y: gy,
      type: this.state.selectedTool.type,
      size: this.state.selectedTool.size,
    };

    this.placementControls.updateConfirmState(
      this.canPlaceTile(this.state.previewTile),
    );
    this.renderCallback();
  }

  private findTileAt(gx: number, gy: number): number {
    return this.state.placedTiles.findIndex(
      (tile) =>
        gx >= tile.x &&
        gx < tile.x + tile.size &&
        gy >= tile.y &&
        gy < tile.y + tile.size,
    );
  }

  private popTile(index: number): Tile | null {
    if (index < 0 || index >= this.state.placedTiles.length) {
      return null;
    }
    return this.state.placedTiles.splice(index, 1)[0];
  }
}
