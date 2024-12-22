import { Application } from "pixi.js";
import { EventBus, SimpleEventBus } from "./EventBus";
import { Scene } from "./Scene";
import { PixiCameraController } from "./camera/CameraController";
import { AppState } from "./data/AppState";
import { AllEvents } from "./data/events";
import { CityNameAssigner } from "./managers/CityNameAssigner";
import { PlacementManager } from "./managers/PlacementManager";
import { SearchManager } from "./managers/SearchManager";
import { TerritoryManager } from "./managers/TerritoryManager";
import { ConfigUI } from "./ui/ConfigUI";
import { PlacementControls } from "./ui/PlacementControls";
import { SearchUI } from "./ui/SearchUI";
import { initializeToolbox } from "./ui/ToolboxUI";

export class Game {
  private app: Application;
  private scene!: Scene;
  private state: AppState;
  private searchManager: SearchManager;
  private cityNameAssigner: CityNameAssigner;
  private territoryManager: TerritoryManager;
  private placementControls: PlacementControls;

  private eventBus: EventBus<AllEvents> = new SimpleEventBus();

  constructor() {
    this.app = new Application();
    this.state = new AppState();
    this.cityNameAssigner = new CityNameAssigner();
    this.territoryManager = new TerritoryManager();
    this.placementControls = new PlacementControls();
    this.searchManager = new SearchManager(this.state.nameAssignmentList);
  }

  async start(element?: HTMLCanvasElement | null) {
    await this.app.init({
      backgroundColor: 0xf0f0f0,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      canvas: element ?? undefined,
      resizeTo: window,
      antialias: true,
    });

    this.app.stage.eventMode = "static";
    this.app.stage.interactive = true;
    this.app.stage.hitArea = this.app.renderer.screen;

    document.body.appendChild(this.app.canvas);

    this.scene = new Scene(
      this.app,
      this.state,
      this.eventBus,
      this.territoryManager,
      this.cityNameAssigner,
    );

    initializeToolbox("toolbox", this.eventBus);

    // Initialize live updating for configuration settings
    new ConfigUI(this.state, this.eventBus); // Moved config panel logic here
    // Initialize search functionality
    new SearchUI(this.searchManager, (name) => this.jumpToBuilding(name));
    // Initialize placement manager
    new PlacementManager(
      this.state,
      this.scene,
      this.placementControls,
      () => this.scene.render(this.state.camera),
      this.eventBus,
    );
    // Initialize camera controller
    new PixiCameraController(
      this.app,
      this.state.camera,
      this.eventBus,
      this.scene,
    );

    this.scene.render(this.state.camera);
  }

  /**
   * Jumps the camera to the specified building's location.
   * @param name The name of the building.
   */
  private jumpToBuilding(name: string): void {
    const assignment = this.state.nameAssignmentList.find(
      (a) => a.name === name,
    );
    if (!assignment) {
      alert(`Building "${name}" not found.`);
      return;
    }
    const worldPos = this.scene.tileToWorld({
      x: assignment.position.x + 1,
      y: assignment.position.y + 1,
    });
    // Center the camera on the building's position
    this.state.camera.offset.x = worldPos.x;
    this.state.camera.offset.y = worldPos.y;

    // Emit camera moved event to trigger re-render
    this.eventBus.emit("camera:move", this.state.camera);
  }
}
