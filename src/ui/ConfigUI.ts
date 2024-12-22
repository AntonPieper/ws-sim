import { AppState } from "../data/AppState";
import { AllEvents } from "../data/events";
import { EventBus } from "../EventBus";
import {
  Configuration,
  ConfigurationManager,
} from "../managers/ConfigurationManager";

export class ConfigUI {
  private configNameInput: HTMLInputElement;
  private configList: HTMLSelectElement;
  private configManagerPanel: HTMLDivElement;
  private cityNamesInput: HTMLTextAreaElement;
  private colorMinInput: HTMLInputElement;
  private colorMaxInput: HTMLInputElement;
  private importFileInput: HTMLInputElement;

  constructor(
    private state: AppState,
    private eventBus: EventBus<AllEvents>,
  ) {
    this.configNameInput = document.getElementById(
      "configName",
    ) as HTMLInputElement;
    this.configList = document.getElementById(
      "configList",
    ) as HTMLSelectElement;
    this.configManagerPanel = document.getElementById(
      "configManager",
    ) as HTMLDivElement;
    this.cityNamesInput = document.getElementById(
      "cityNamesInput",
    ) as HTMLTextAreaElement;
    this.colorMinInput = document.getElementById(
      "colorMin",
    ) as HTMLInputElement;
    this.colorMaxInput = document.getElementById(
      "colorMax",
    ) as HTMLInputElement;
    this.importFileInput = document.getElementById(
      "importConfigInput",
    ) as HTMLInputElement;

    this.addEventListeners();
    this.refreshConfigList();
  }

  private addEventListeners() {
    // Buttons
    document
      .getElementById("saveConfig")!
      .addEventListener("click", () => this.saveConfiguration());
    document
      .getElementById("loadConfig")!
      .addEventListener("click", () => this.loadConfiguration());
    document
      .getElementById("deleteConfig")!
      .addEventListener("click", () => this.deleteConfiguration());
    document
      .getElementById("exportConfig")!
      .addEventListener("click", () => this.exportConfiguration());
    document
      .getElementById("importConfig")!
      .addEventListener("click", () => this.importConfiguration());
    document
      .getElementById("toggleConfigPanel")!
      .addEventListener("click", () => this.toggleConfigPanel());

    // File input
    this.importFileInput.addEventListener("change", (event) =>
      this.handleImportFile(event),
    );

    // City name / color scale changes
    this.cityNamesInput.addEventListener("input", () =>
      this.handleCityNamesChange(),
    );
    this.colorMinInput.addEventListener("input", () =>
      this.handleColorMinChange(),
    );
    this.colorMaxInput.addEventListener("input", () =>
      this.handleColorMaxChange(),
    );
  }

  private handleCityNamesChange(): void {
    this.state.cityNames = this.cityNamesInput.value
      .split("\n")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
    // Re-render
    this.eventBus.emit("camera:move", this.state.camera);
  }

  private handleColorMinChange(): void {
    const value = parseInt(this.colorMinInput.value, 10);
    this.state.colorMin = isNaN(value) ? 0 : value;
    this.eventBus.emit("camera:move", this.state.camera);
  }

  private handleColorMaxChange(): void {
    const value = parseInt(this.colorMaxInput.value, 10);
    this.state.colorMax = isNaN(value) ? 0 : value;
    this.eventBus.emit("camera:move", this.state.camera);
  }

  private toggleConfigPanel(): void {
    this.configManagerPanel.classList.toggle("collapsed");
  }

  private saveConfiguration(): void {
    const configName = this.configNameInput.value.trim();
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

  private loadConfiguration(): void {
    const selectedConfig = this.configList.value;
    if (!selectedConfig) {
      alert("Please select a configuration to load.");
      return;
    }

    const loaded = ConfigurationManager.loadConfiguration(selectedConfig);
    if (loaded) {
      this.state.placedTiles = loaded.tiles;
      this.state.cityNames = loaded.cityNames;
      this.state.colorMin = loaded.colorMin;
      this.state.colorMax = loaded.colorMax;

      const bearTrap = this.state.placedTiles.find(
        (t) => t.type === "bear_trap",
      );
      this.state.bearTrapPosition = bearTrap
        ? {
            x: bearTrap.x + bearTrap.size / 2,
            y: bearTrap.y + bearTrap.size / 2,
          }
        : null;

      // Reflect new values in the UI
      this.cityNamesInput.value = this.state.cityNames.join("\n");
      this.colorMinInput.value = String(this.state.colorMin);
      this.colorMaxInput.value = String(this.state.colorMax);

      // Trigger a re-render
      this.eventBus.emit("camera:move", this.state.camera);
    }
  }

  private deleteConfiguration(): void {
    const selectedConfig = this.configList.value;
    if (!selectedConfig) {
      alert("Please select a configuration to delete.");
      return;
    }
    ConfigurationManager.deleteConfiguration(selectedConfig);
    this.refreshConfigList();
    alert(`Configuration "${selectedConfig}" deleted successfully!`);
  }

  private exportConfiguration(): void {
    const selectedConfig = this.configList.value;
    if (!selectedConfig) {
      alert("Please select a configuration to export.");
      return;
    }

    const exported = ConfigurationManager.exportConfiguration(selectedConfig);
    if (!exported) {
      alert(`Failed to export configuration "${selectedConfig}".`);
      return;
    }

    const blob = new Blob([exported], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedConfig}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private importConfiguration(): void {
    this.importFileInput.value = "";
    this.importFileInput.click();
  }

  private handleImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = reader.result as string;
        const configName = prompt(
          "Enter a name for the imported configuration:",
          file.name.replace(/\.[^/.]+$/, ""),
        );

        if (!configName) {
          alert("Import cancelled: No configuration name provided.");
          return;
        }

        // Overwrite check
        const existingConfigs = ConfigurationManager.listConfigurations();
        if (existingConfigs.includes(configName)) {
          const overwrite = confirm(
            `Configuration "${configName}" already exists. Overwrite?`,
          );
          if (!overwrite) {
            alert("Import cancelled: Configuration name already exists.");
            return;
          }
        }

        const success = ConfigurationManager.importConfiguration(
          configName,
          content,
        );
        if (success) {
          this.refreshConfigList();
          alert(`Configuration "${configName}" imported successfully!`);
        } else {
          alert(
            "Failed to import configuration. Please ensure the file is valid.",
          );
        }
      } catch (error) {
        console.error("Error importing configuration:", error);
        alert(
          "Failed to import configuration. Please ensure the file is valid.",
        );
      }
    };
    reader.readAsText(file);
  }

  private refreshConfigList(): void {
    this.configList.innerHTML =
      '<option value="">-- Select Configuration --</option>';
    const configs = ConfigurationManager.listConfigurations();
    configs.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      this.configList.appendChild(option);
    });
  }
}
