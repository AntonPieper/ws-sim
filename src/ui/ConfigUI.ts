import { AppState } from "../data/AppState";
import { AllEvents } from "../data/events";
import { EventBus } from "../EventBus";
import {
  Configuration,
  ConfigurationManager,
} from "../managers/ConfigurationManager";

/**
 * Complete ConfigUI Example
 */
export class ConfigUI {
  // DOM references
  private configNameInput: HTMLInputElement;
  private configList: HTMLSelectElement;
  private configManagerPanel: HTMLDivElement;
  private cityNamesInput: HTMLTextAreaElement;
  private colorMinInput: HTMLInputElement;
  private colorMaxInput: HTMLInputElement;
  private importFileInput: HTMLInputElement;

  // Dropdown for switching between "Min Distance" and a chosen bear trap index
  private bearTrapSelector: HTMLSelectElement;

  constructor(
    private state: AppState,
    private eventBus: EventBus<AllEvents>,
  ) {
    // Grab all required DOM elements by ID
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

    // If you placed a <select id="bearTrapSelector"> in index.html
    // otherwise, remove all references to bearTrapSelector
    this.bearTrapSelector = document.getElementById(
      "bearTrapSelector",
    ) as HTMLSelectElement;

    // Add event listeners, populate config list, etc.
    this.addEventListeners();
    this.refreshConfigList();
    this.refreshBearTrapSelector(); // build trap dropdown
  }

  private addEventListeners() {
    // Buttons in your config panel
    document
      .getElementById("saveConfig")
      ?.addEventListener("click", () => this.saveConfiguration());
    document
      .getElementById("loadConfig")
      ?.addEventListener("click", () => this.loadConfiguration());
    document
      .getElementById("deleteConfig")
      ?.addEventListener("click", () => this.deleteConfiguration());
    document
      .getElementById("exportConfig")
      ?.addEventListener("click", () => this.exportConfiguration());
    document
      .getElementById("importConfig")
      ?.addEventListener("click", () => this.importConfiguration());
    document
      .getElementById("toggleConfigPanel")
      ?.addEventListener("click", () => this.toggleConfigPanel());

    // File input for import
    this.importFileInput.addEventListener("change", (event) =>
      this.handleImportFile(event),
    );

    // Optional city names text area (if still used)
    this.cityNamesInput.addEventListener("input", () => {
      // Could do something like:
      // this.state.cityNames = this.cityNamesInput.value.split("\n").map(...);
      // For now we just force a re-render:
      this.eventBus.emit("camera:move", this.state.camera);
    });

    // Color scale inputs
    this.colorMinInput.addEventListener("input", () => {
      const val = parseInt(this.colorMinInput.value, 10);
      this.state.colorMin = isNaN(val) ? 0 : val;
      this.eventBus.emit("camera:move", this.state.camera);
    });

    this.colorMaxInput.addEventListener("input", () => {
      const val = parseInt(this.colorMaxInput.value, 10);
      this.state.colorMax = isNaN(val) ? 0 : val;
      this.eventBus.emit("camera:move", this.state.camera);
    });

    // Bear trap selection (for distance)
    if (this.bearTrapSelector) {
      this.bearTrapSelector.addEventListener("change", () => {
        this.state.selectedTrapIndex = parseInt(
          this.bearTrapSelector.value,
          10,
        );
        // Force a re-render so distances update
        this.eventBus.emit("camera:move", this.state.camera);
      });
    }
  }

  /**
   * Rebuild the trap dropdown. Called after placing/removing bear traps or after loading config.
   */
  public refreshBearTrapSelector(): void {
    if (!this.bearTrapSelector) return;

    // Start with the "Min Distance" option
    this.bearTrapSelector.innerHTML =
      "<option value='-1'>Min Distance</option>";

    // Filter out all bear_trap tiles
    const bearTraps = this.state.placedTiles.filter(
      (t) => t.type === "bear_trap",
    );
    bearTraps.forEach((trap, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `Bear Trap #${i + 1}`;
      this.bearTrapSelector.appendChild(opt);
    });

    // Ensure the dropdown matches our current selectedTrapIndex
    this.bearTrapSelector.value = String(this.state.selectedTrapIndex);
  }

  /**
   * Toggles the entire config panel open/closed
   */
  private toggleConfigPanel(): void {
    this.configManagerPanel.classList.toggle("collapsed");
  }

  /**
   * Save config to localStorage
   */
  private saveConfiguration(): void {
    const configName = this.configNameInput.value.trim();
    if (!configName) {
      alert("Please enter a configuration name.");
      return;
    }

    // Build a config object
    // (If you no longer use cityNames, you can omit)
    const config: Configuration = {
      placedTiles: this.state.placedTiles,
      cityNames: [], // or remove if not used
      colorMin: this.state.colorMin,
      colorMax: this.state.colorMax,
    };

    // Save via manager
    ConfigurationManager.saveConfiguration(configName, config);

    // Refresh list
    this.refreshConfigList();
    alert(`Configuration "${configName}" saved successfully!`);
  }

  /**
   * Load config from localStorage
   */
  private loadConfiguration(): void {
    const selectedConfig = this.configList.value;
    if (!selectedConfig) {
      alert("Please select a configuration to load.");
      return;
    }

    const loaded = ConfigurationManager.loadConfiguration(selectedConfig);
    if (!loaded) {
      alert(`Failed to load configuration "${selectedConfig}".`);
      return;
    }

    // Update state
    this.state.placedTiles.length = 0;
    this.state.placedTiles.push(...loaded.tiles);
    this.eventBus.emit("config:loaded");
    // If you kept cityNames in the config:
    // this.state.cityNames = loaded.cityNames;
    this.state.colorMin = loaded.colorMin;
    this.state.colorMax = loaded.colorMax;

    // Optionally reset selectedTrapIndex, or keep previous
    this.state.selectedTrapIndex = -1; // or keep it

    // Reflect new values in UI
    this.colorMinInput.value = String(this.state.colorMin);
    this.colorMaxInput.value = String(this.state.colorMax);

    // Rebuild the trap dropdown
    this.refreshBearTrapSelector();

    // Force re-render
    this.eventBus.emit("camera:move", this.state.camera);
  }

  /**
   * Delete a configuration
   */
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

  /**
   * Export a configuration to JSON
   */
  private exportConfiguration(): void {
    const selectedConfig = this.configList.value;
    if (!selectedConfig) {
      alert("Please select a configuration to export.");
      return;
    }
    const exported = ConfigurationManager.exportConfiguration(selectedConfig);
    if (!exported) {
      alert(`Failed to export "${selectedConfig}".`);
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

  /**
   * Let user pick a file to import
   */
  private importConfiguration(): void {
    this.importFileInput.value = "";
    this.importFileInput.click();
  }

  /**
   * Reads the file and imports JSON
   */
  private handleImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = reader.result as string;
        const configName = prompt(
          "Enter a name for the imported configuration:",
          file.name.replace(/\.[^/.]+$/, ""), // remove file extension
        );
        if (!configName) {
          alert("Import cancelled: no config name provided.");
          return;
        }
        // Overwrite check
        const existingConfigs = ConfigurationManager.listConfigurations();
        if (existingConfigs.includes(configName)) {
          const overwrite = confirm(
            `Configuration "${configName}" already exists. Overwrite?`,
          );
          if (!overwrite) {
            alert("Import cancelled: config name exists.");
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
          alert("Failed to import configuration. Invalid file?");
        }
      } catch (err) {
        console.error("Error importing config:", err);
        alert("Failed to import configuration. Invalid file?");
      }
    };
    reader.readAsText(file);
  }

  /**
   * Populates the <select> of saved configs
   */
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
