import { Application, Container, Graphics } from "pixi.js";
import { AppState } from "./data/AppState";
import { BANNER_ZONE_COLORS, GRID_SIZE } from "./data/constants";
import { CityNameAssigner } from "./managers/CityNameAssigner";
import { TerritoryManager } from "./managers/TerritoryManager";
import { drawPreviewTile, drawTiles } from "./rendering/drawTiles";
import { createGrid } from "./rendering/GridRenderer";

export class Scene {
  public app: Application;
  private state: AppState;

  private cameraContainer: Container;
  private gridContainer: Container;
  private zoneContainer: Container;
  private tilesContainer: Container;
  private previewContainer: Container;

  private territoryManager: TerritoryManager;
  private cityNameAssigner: CityNameAssigner;

  constructor(
    app: Application,
    state: AppState,
    territoryManager: TerritoryManager,
    cityNameAssigner: CityNameAssigner,
  ) {
    this.app = app;
    this.state = state;
    this.territoryManager = territoryManager;
    this.cityNameAssigner = cityNameAssigner;

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
  }

  public render() {
    this.cameraContainer.position.set(
      -this.state.offset.x * this.state.cameraScale,
      -this.state.offset.y * this.state.cameraScale,
    );
    this.cameraContainer.scale.set(this.state.cameraScale);

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
  public refreshTiles() {
    this.render();
  }
}
