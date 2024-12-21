// src/Game.ts

import { Application } from "pixi.js";
import { EventBus, SimpleEventBus } from "./EventBus";
import { Scene } from "./Scene";
import { PixiCameraController } from "./camera/CameraController";
import { AppState } from "./data/AppState";
import { AllEvents } from "./data/events";
import { CityNameAssigner } from "./managers/CityNameAssigner";
import {
  Configuration,
  ConfigurationManager,
} from "./managers/ConfigurationManager";
import { PlacementManager } from "./managers/PlacementManager";
import { SearchManager } from "./managers/SearchManager";
import { TerritoryManager } from "./managers/TerritoryManager";
import { PlacementControls } from "./ui/PlacementControls";
import { initializeToolbox } from "./ui/ToolboxUI";

export class Game {
  private app: Application;
  private scene!: Scene;
  private state: AppState;
  private searchManager: SearchManager;
  private cityNameAssigner: CityNameAssigner;
  private territoryManager: TerritoryManager;
  private placementManager!: PlacementManager;
  private placementControls: PlacementControls;
  private cameraController!: PixiCameraController;

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

    this.placementManager = new PlacementManager(
      this.state,
      this.scene,
      this.placementControls,
      () => this.scene.render(this.state.camera),
      this.eventBus,
    );
    // TODO: Refactor PlacementManager, so that either it makes sense to create an instance or make it not a class.
    this.placementManager;

    this.cameraController = new PixiCameraController(
      this.app,
      this.state.camera,
      this.eventBus,
      this.scene,
    );
    // TODO: Refactor PixiCameraController, so that either it makes sense to create an instance or make it not a class.
    this.cameraController;

    // Event listeners for configuration management
    document
      .getElementById("saveConfig")!
      .addEventListener("click", () => this.saveConfiguration());
    document
      .getElementById("loadConfig")!
      .addEventListener("click", () => this.loadConfiguration());
    document
      .getElementById("deleteConfig")!
      .addEventListener("click", () => this.deleteConfiguration());

    // Event listener for toggling config panel
    document
      .getElementById("toggleConfigPanel")!
      .addEventListener("click", () => this.toggleConfigPanel());

    // Initialize search functionality
    this.initializeSearch();

    // Initialize live updating for configuration settings
    this.initializeSettingInputs();

    this.scene.render(this.state.camera);
    this.refreshConfigList();
  }

  /**
   * Initializes live updating for configuration settings.
   */
  private initializeSettingInputs(): void {
    const cityNamesInput = document.getElementById(
      "cityNamesInput",
    ) as HTMLTextAreaElement;
    const colorMinInput = document.getElementById(
      "colorMin",
    ) as HTMLInputElement;
    const colorMaxInput = document.getElementById(
      "colorMax",
    ) as HTMLInputElement;

    cityNamesInput.addEventListener("input", (event) => {
      const input = event.target as HTMLTextAreaElement;
      this.state.cityNames = input.value
        .split("\n")
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
      this.scene.render(this.state.camera);
      this.updateSearchManager();
    });

    colorMinInput.addEventListener("input", (event) => {
      const input = event.target as HTMLInputElement;
      const value = parseInt(input.value, 10);
      this.state.colorMin = isNaN(value) ? 0 : value;
      this.scene.render(this.state.camera);
      this.updateSearchManager();
    });

    colorMaxInput.addEventListener("input", (event) => {
      const input = event.target as HTMLInputElement;
      const value = parseInt(input.value, 10);
      this.state.colorMax = isNaN(value) ? 0 : value;
      this.scene.render(this.state.camera);
      this.updateSearchManager();
    });
  }

  /**
   * Initializes the search functionality by setting up event listeners.
   */
  private initializeSearch(): void {
    const buildingSearchInput = document.getElementById(
      "buildingSearch",
    ) as HTMLInputElement;
    const searchResults = document.getElementById(
      "searchResults",
    ) as HTMLDivElement;

    // Debounce the search input to improve performance
    const debounce = (func: Function, wait: number) => {
      let timeout: number;
      return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => func(...args), wait);
      };
    };

    buildingSearchInput.addEventListener(
      "input",
      debounce(this.handleSearchInput.bind(this), 100),
    );
    buildingSearchInput.addEventListener("focus", (event) => {
      this.handleSearchInput(event);
    });

    // Hide search results when clicking outside
    document.addEventListener("click", (e) => {
      if (!document.getElementById("searchPanel")!.contains(e.target as Node)) {
        searchResults.style.display = "none";
      }
    });
  }

  /**
   * Handles the search input event.
   * @param event The input event.
   */
  private handleSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input.value.trim();
    const searchResults = document.getElementById(
      "searchResults",
    ) as HTMLDivElement;

    const matches = this.searchManager.search(query);

    if (matches.length === 0) {
      searchResults.innerHTML =
        "<div class='search-result-item'>No results found</div>";
      searchResults.style.display = "block";
      return;
    }

    searchResults.innerHTML = "";
    matches.forEach((assignment) => {
      const div = document.createElement("div");
      div.classList.add("search-result-item");
      div.textContent = assignment.name;
      div.addEventListener("click", () => {
        this.jumpToBuilding(assignment.name);
        searchResults.style.display = "none";
      });
      searchResults.appendChild(div);
    });

    searchResults.style.display = "block";
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

  /**
   * Toggles the visibility of the configuration panel.
   */
  private toggleConfigPanel(): void {
    const configManager = document.getElementById("configManager")!;
    configManager.classList.toggle("collapsed");
  }

  /**
   * Saves the current configuration.
   */
  private saveConfiguration(): void {
    const configNameInput = document.getElementById(
      "configName",
    ) as HTMLInputElement;
    const configName = configNameInput.value.trim();
    if (!configName) {
      alert("Please enter a configuration name.");
      return;
    }

    const config: Configuration = {
      placedTiles: this.state.placedTiles,
      cityNames: this.state.cityNames,
      colorMin: this.state.colorMin,
      colorMax: this.state.colorMax,
    };

    ConfigurationManager.saveConfiguration(configName, config);
    this.refreshConfigList();
    alert(`Configuration "${configName}" saved successfully!`);
  }

  /**
   * Loads the selected configuration.
   */
  private loadConfiguration(): void {
    const configList = document.getElementById(
      "configList",
    ) as HTMLSelectElement;
    const selectedConfig = configList.value;
    if (!selectedConfig) {
      alert("Please select a configuration to load.");
      return;
    }

    const loadedConfig = ConfigurationManager.loadConfiguration(selectedConfig);
    if (loadedConfig) {
      this.state.placedTiles = loadedConfig.tiles;
      this.state.cityNames = loadedConfig.cityNames;
      this.state.colorMin = loadedConfig.colorMin;
      this.state.colorMax = loadedConfig.colorMax;

      const bearTrap = this.state.placedTiles.find(
        (t) => t.type === "bear_trap",
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
        this.state.colorMin,
      );
      (document.getElementById("colorMax") as HTMLInputElement).value = String(
        this.state.colorMax,
      );

      this.scene.render(this.state.camera);
      this.updateSearchManager();
    }
  }

  /**
   * Deletes the selected configuration.
   */
  private deleteConfiguration(): void {
    const configList = document.getElementById(
      "configList",
    ) as HTMLSelectElement;
    const selectedConfig = configList.value;
    if (!selectedConfig) {
      alert("Please select a configuration to delete.");
      return;
    }
    ConfigurationManager.deleteConfiguration(selectedConfig);
    this.refreshConfigList();
    alert(`Configuration "${selectedConfig}" deleted successfully!`);
  }

  /**
   * Refreshes the configuration list in the UI.
   */
  private refreshConfigList(): void {
    const configList = document.getElementById(
      "configList",
    ) as HTMLSelectElement;
    configList.innerHTML =
      '<option value="">-- Select Configuration --</option>';
    const configs = ConfigurationManager.listConfigurations();
    configs.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      configList.appendChild(option);
    });
  }

  /**
   * Updates the SearchManager with the latest name assignments.
   */
  private updateSearchManager(): void {
    this.searchManager.updateNameAssignments(this.state.nameAssignmentList);
  }
}
