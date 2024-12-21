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
    if (config) {
      if (typeof config.placedTiles === "string") {
        // Backwards compatibility
        config.placedTiles = JSON.parse(config.placedTiles);
        // Save the updated config
        this.saveConfiguration(configName, config);
      }
      const loadedTiles: Tile[] = config.placedTiles;
      return {
        tiles: loadedTiles,
        cityNames: config.cityNames,
        colorMin: config.colorMin,
        colorMax: config.colorMax,
      };
    }
    return null;
  }

  static deleteConfiguration(configName: string) {
    const configs = this.getAllConfigurations();
    delete configs[configName];
    localStorage.setItem(
      ConfigurationManager.storageKey,
      JSON.stringify(configs),
    );
  }

  private static getAllConfigurations(): TileConfigs {
    return JSON.parse(
      localStorage.getItem(ConfigurationManager.storageKey) || "{}",
    );
  }
}