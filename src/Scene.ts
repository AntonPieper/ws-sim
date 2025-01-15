import { Application, Container, Graphics } from "pixi.js";
import { AppState } from "./data/AppState";
import { BANNER_ZONE_COLORS, GRID_SIZE } from "./data/constants";
import { CameraEvents } from "./data/events";
import { CameraState, Position } from "./data/types";
import { EventBus } from "./EventBus";
import { TerritoryManager } from "./managers/TerritoryManager";
import { drawPreviewTile, drawTiles } from "./rendering/drawTiles";
import { createGrid } from "./rendering/GridRenderer";

export class Scene {
  private cameraContainer: Container;
  private gridContainer: Container;
  private zoneContainer: Container;
  private tilesContainer: Container;
  private previewContainer: Container;

  constructor(
    private app: Application,
    private state: AppState,
    private eventBus: EventBus<CameraEvents>,
    private territoryManager: TerritoryManager,
  ) {
    this.cameraContainer = new Container();
    this.gridContainer = createGrid();
    this.zoneContainer = new Container();
    this.tilesContainer = new Container();
    this.previewContainer = new Container();

    this.cameraContainer.addChild(
      this.gridContainer,
      this.zoneContainer,
      this.tilesContainer,
      this.previewContainer,
    );
    this.app.stage.addChild(this.cameraContainer);

    this.eventBus.on("camera:moved", this.render.bind(this));
  }

  public screenToWorld(position: Position): Position {
    return this.cameraContainer.toLocal(position);
  }

  public worldToScreen(position: Position): Position {
    return this.cameraContainer.toGlobal(position);
  }

  public tileToWorld(tilePosition: Position): Position {
    return {
      x: tilePosition.x * GRID_SIZE,
      y: tilePosition.y * GRID_SIZE,
    };
  }

  public worldToTile(worldPosition: Position): Position {
    return {
      x: worldPosition.x / GRID_SIZE,
      y: worldPosition.y / GRID_SIZE,
    };
  }

  public tileToScreen(tilePosition: Position): Position {
    return this.worldToScreen(this.tileToWorld(tilePosition));
  }

  public screenToTile(globalPosition: Position): Position {
    return this.worldToTile(this.screenToWorld(globalPosition));
  }

  public render(camera: CameraState) {
    // Position & scale
    this.cameraContainer.position.set(
      -camera.offset.x * camera.scale + this.app.screen.width / 2,
      -camera.offset.y * camera.scale + this.app.screen.height / 2,
    );
    this.cameraContainer.scale.set(camera.scale);

    // 45-degree rotation
    const rotationAngle = -Math.PI / 4;
    this.cameraContainer.rotation = rotationAngle;

    // Clear zone container
    for (const child of this.zoneContainer.removeChildren()) {
      child.destroy(true);
    }
    // Build zone sets
    const zones = this.territoryManager.computeBannerZones(
      this.state.placedTiles,
      this.state.previewTile ?? undefined,
    );

    // Draw zone overlays
    let colorIndex = 0;
    for (const zone of zones) {
      const color = BANNER_ZONE_COLORS[colorIndex % BANNER_ZONE_COLORS.length];
      const zoneColor = (color.r << 16) + (color.g << 8) + color.b;

      for (const cellKey of zone) {
        const [cx, cy] = cellKey.split(",").map(Number);
        const g = new Graphics();
        g.rect(cx * GRID_SIZE, cy * GRID_SIZE, GRID_SIZE, GRID_SIZE).fill({
          color: zoneColor,
          alpha: 0.2,
        });
        this.zoneContainer.addChild(g);
      }
      colorIndex++;
    }

    // Clear and redraw tiles
    for (const child of this.tilesContainer.removeChildren()) {
      child.destroy(true);
    }
    drawTiles(this.tilesContainer, this.state, zones);

    // Clear and redraw preview
    for (const child of this.previewContainer.removeChildren()) {
      child.destroy(true);
    }
    if (this.state.isInPlacementMode && this.state.previewTile) {
      drawPreviewTile(this.previewContainer, this.state, zones);
    }
  }
}
