import {
  DEFAULT_COLOR_SCALE_MAX,
  DEFAULT_COLOR_SCALE_MIN,
} from "../data/constants";
import { Tile } from "../data/types";

interface TileConfig {
  placedTiles: Tile[];
  cityNames: string[];
  colorMin: number;
  colorMax: number;
}

interface TileConfigs {
  [key: string]: TileConfig;
}

export interface Configuration {
  placedTiles: Tile[];
  cityNames: string[];
  colorMin: number;
  colorMax: number;
}

export class ConfigurationManager {
  private static storageKey = "tileConfigs";

  static saveConfiguration(configName: string, config: Configuration) {
    const configs = this.getAllConfigurations();
    config.colorMin ??= DEFAULT_COLOR_SCALE_MIN;
    config.colorMax ??= DEFAULT_COLOR_SCALE_MAX;
    configs[configName] = config;
    localStorage.setItem(
      ConfigurationManager.storageKey,
      JSON.stringify(configs),
    );
  }

  static listConfigurations(): string[] {
    const configs = this.getAllConfigurations();
    return Object.keys(configs);
  }

  static loadConfiguration(configName: string): {
    tiles: Tile[];
    cityNames: string[];
    colorMin: number;
    colorMax: number;
  } | null {
    const configs = this.getAllConfigurations();
    const config = configs[configName];
    if (config === undefined) {
      return null;
    }
    this.backwardsCompatibility(configName, config);
    const loadedTiles: Tile[] = config.placedTiles;
    return {
      tiles: loadedTiles,
      cityNames: config.cityNames,
      colorMin: config.colorMin,
      colorMax: config.colorMax,
    };
  }

  private static backwardsCompatibility(
    configName: string,
    config: TileConfig,
  ) {
    // Set default values if not present
    config.colorMin ??= DEFAULT_COLOR_SCALE_MIN;
    config.colorMax ??= DEFAULT_COLOR_SCALE_MAX;
    // Convert string to JSON if needed
    if (typeof config.placedTiles === "string") {
      // Backwards compatibility
      config.placedTiles = JSON.parse(config.placedTiles);
      // Save the updated config
      this.saveConfiguration(configName, config);
    }
  }

  static deleteConfiguration(configName: string) {
    const configs = this.getAllConfigurations();
    delete configs[configName];
    localStorage.setItem(
      ConfigurationManager.storageKey,
      JSON.stringify(configs),
    );
  }

  /**
   * Exports a configuration as a formatted JSON string.
   * @param configName The name of the configuration to export.
   * @returns A JSON string of the configuration or null if not found.
   */
  static exportConfiguration(configName: string): string | null {
    const configs = this.getAllConfigurations();
    const config = configs[configName];
    if (config) {
      return JSON.stringify(config, null, 2); // Pretty-print with 2 spaces
    }
    return null;
  }

  /**
   * Imports a configuration from a JSON string.
   * @param configName The name to assign to the imported configuration.
   * @param configJson The JSON string representing the configuration.
   * @returns True if import was successful, false otherwise.
   */
  static importConfiguration(configName: string, configJson: string): boolean {
    try {
      const config: Configuration = JSON.parse(configJson);
      // Optional: Validate the configuration structure here
      this.saveConfiguration(configName, config);
      return true;
    } catch (error) {
      console.error("Failed to import configuration:", error);
      return false;
    }
  }

  private static getAllConfigurations(): TileConfigs {
    return JSON.parse(
      localStorage.getItem(ConfigurationManager.storageKey) || "{}",
    );
  }
}
