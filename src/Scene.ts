import { Application, Container, Graphics } from "pixi.js";
import { AppState } from "./data/AppState";
import { BANNER_ZONE_COLORS, GRID_SIZE } from "./data/constants";
import { CityNameAssigner } from "./managers/CityNameAssigner";
import { TerritoryManager } from "./managers/TerritoryManager";
import { drawPreviewTile, drawTiles } from "./rendering/drawTiles";
import { createGrid } from "./rendering/GridRenderer";
import { EventBus } from "./EventBus";
import { CameraEvents } from "./data/events";
import { CameraState, Position } from "./data/types";

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
    private cityNameAssigner: CityNameAssigner,
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
    this.cameraContainer.position.set(
      -camera.offset.x * camera.scale + this.app.screen.width / 2,
      -camera.offset.y * camera.scale + this.app.screen.height / 2,
    );
    this.cameraContainer.scale.set(camera.scale);

    this.zoneContainer.removeChildren();
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
        const [x, y] = cellKey.split(",").map(Number);
        const g = new Graphics();
        g.rect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE).fill({
          color: zoneColor,
          alpha: 0.2,
        });
        this.zoneContainer.addChild(g);
      }

      colorIndex++;
    }

    this.tilesContainer.removeChildren();
    this.state.nameAssignments = this.cityNameAssigner.assignNames(
      this.state.placedTiles,
      this.state.cityNames,
      this.state.bearTrapPosition,
    );
    drawTiles(this.tilesContainer, this.state, zones);

    this.previewContainer.removeChildren();
    if (this.state.isInPlacementMode && this.state.previewTile) {
      drawPreviewTile(this.previewContainer, this.state, zones);
    }
  }
}
