import { Tile } from "../data/types";

interface TileConfig {
  placedTiles: string;
  cityNames: string[];
  colorMin: number;
  colorMax: number;
}

interface TileConfigs {
  [key: string]: TileConfig;
}

export class ConfigurationManager {
  private storageKey = "tileConfigs";

  saveConfiguration(
    configName: string,
    placedTiles: Tile[],
    cityNames: string[],
    colorMin: number,
    colorMax: number,
  ) {
    const configs = this.getAllConfigurations();
    configs[configName] = {
      placedTiles: JSON.stringify(placedTiles),
      cityNames,
      colorMin,
      colorMax,
    };
    localStorage.setItem(this.storageKey, JSON.stringify(configs));
  }

  listConfigurations(): string[] {
    const configs = this.getAllConfigurations();
    return Object.keys(configs);
  }

  loadConfiguration(configName: string): {
    tiles: Tile[];
    cityNames: string[];
    colorMin: number;
    colorMax: number;
  } | null {
    const configs = this.getAllConfigurations();
    const config = configs[configName];
    if (config) {
      const loadedTiles: Tile[] = JSON.parse(config.placedTiles);
      return {
        tiles: loadedTiles,
        cityNames: config.cityNames,
        colorMin: config.colorMin,
        colorMax: config.colorMax,
      };
    }
    return null;
  }

  deleteConfiguration(configName: string) {
    const configs = this.getAllConfigurations();
    delete configs[configName];
    localStorage.setItem(this.storageKey, JSON.stringify(configs));
  }

  private getAllConfigurations(): TileConfigs {
    return JSON.parse(localStorage.getItem(this.storageKey) || "{}");
  }
}
