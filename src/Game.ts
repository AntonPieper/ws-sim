import { Application } from "pixi.js";
import { EventBus, SimpleEventBus } from "./EventBus";
import { Scene } from "./Scene";
import { PixiCameraController } from "./camera/PixiCameraController";
import { AppState } from "./data/AppState";
import { AllEvents } from "./data/events";
import { CityNameAssigner } from "./managers/CityNameAssigner";
import { ConfigurationManager } from "./managers/ConfigManager";
import { PlacementManager } from "./managers/PlacementManager";
import { TerritoryManager } from "./managers/TerritoryManager";
import { ModalManager } from "./ui/ModalManager";
import { PlacementControls } from "./ui/PlacementControls";
import { initializeToolbox } from "./ui/ToolboxUI";

export class Game {
  private app: Application;
  private scene!: Scene;
  private state: AppState;
  private modalManager!: ModalManager;
  private configManager: ConfigurationManager;
  private cityNameAssigner: CityNameAssigner;
  private territoryManager: TerritoryManager;
  private placementManager!: PlacementManager;
  private placementControls: PlacementControls;
  private cameraController!: PixiCameraController;

  private eventBus: EventBus<AllEvents> = new SimpleEventBus();

  constructor() {
    this.app = new Application();
    this.state = new AppState();
    this.configManager = new ConfigurationManager();
    this.cityNameAssigner = new CityNameAssigner();
    this.territoryManager = new TerritoryManager();
    this.placementControls = new PlacementControls();
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
      this.cityNameAssigner
    );

    initializeToolbox("toolbox", this.eventBus);

    this.modalManager = new ModalManager(
      "nameModal",
      "saveNames",
      "closeModal",
      (cityNames, colorMin, colorMax) => {
        this.state.cityNames = cityNames;
        this.state.colorMin = colorMin;
        this.state.colorMax = colorMax;
        this.scene.render(this.state.camera);
      }
    );

    this.placementManager = new PlacementManager(
      this.state,
      this.scene,
      this.placementControls,
      () => this.scene.render(this.state.camera),
      this.eventBus
    );

    this.cameraController = new PixiCameraController(
      this.app,
      this.state.camera,
      this.eventBus,
      this.scene
    );

    // The rest of your Game logic like config load/save stays the same

    document
      .getElementById("configureNames")!
      .addEventListener("click", () => this.modalManager.show());
    document
      .getElementById("saveConfig")!
      .addEventListener("click", () => this.saveConfiguration());
    document
      .getElementById("loadConfig")!
      .addEventListener("click", () => this.loadConfiguration());
    document
      .getElementById("deleteConfig")!
      .addEventListener("click", () => this.deleteConfiguration());

    this.scene.render(this.state.camera);
    this.refreshConfigList();
  }

  private saveConfiguration() {
    const configName = (
      document.getElementById("configName") as HTMLInputElement
    ).value.trim();
    if (!configName) {
      alert("Please enter a configuration name.");
      return;
    }
    this.configManager.saveConfiguration(
      configName,
      this.state.placedTiles,
      this.state.cityNames,
      this.state.colorMin,
      this.state.colorMax
    );
    this.refreshConfigList();
    alert(`Configuration "${configName}" saved successfully!`);
  }

  private loadConfiguration() {
    const configList = document.getElementById(
      "configList"
    ) as HTMLSelectElement;
    const selectedConfig = configList.value;
    if (!selectedConfig) {
      alert("Please select a configuration to load.");
      return;
    }
    const loaded = this.configManager.loadConfiguration(selectedConfig);
    if (loaded) {
      this.state.placedTiles = loaded.tiles;
      this.state.cityNames = loaded.cityNames;
      this.state.colorMin = loaded.colorMin;
      this.state.colorMax = loaded.colorMax;

      const bearTrap = this.state.placedTiles.find(
        (t) => t.type === "bear_trap"
      );
      this.state.bearTrapPosition = bearTrap
        ? {
            x: bearTrap.x + bearTrap.size / 2,
            y: bearTrap.y + bearTrap.size / 2,
          }
        : null;

      (document.getElementById("cityNamesInput") as HTMLTextAreaElement).value =
        this.state.cityNames.join("\n");
      (document.getElementById("colorMin") as HTMLInputElement).value = String(
        this.state.colorMin
      );
      (document.getElementById("colorMax") as HTMLInputElement).value = String(
        this.state.colorMax
      );

      this.scene.render(this.state.camera);
    }
  }

  private deleteConfiguration() {
    const configList = document.getElementById(
      "configList"
    ) as HTMLSelectElement;
    const selectedConfig = configList.value;
    if (!selectedConfig) {
      alert("Please select a configuration to delete.");
      return;
    }
    this.configManager.deleteConfiguration(selectedConfig);
    this.refreshConfigList();
    alert(`Configuration "${selectedConfig}" deleted successfully!`);
  }

  private refreshConfigList() {
    const configList = document.getElementById(
      "configList"
    ) as HTMLSelectElement;
    configList.innerHTML =
      '<option value="">-- Select Configuration --</option>';
    const configs = this.configManager.listConfigurations();
    configs.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      configList.appendChild(option);
    });
  }
}
