// src/managers/SearchManager.ts

import { Tile } from "../data/types";

export class SearchManager {
  private placedTiles: Tile[];

  constructor(initialTiles: Tile[]) {
    // You can pass in the state's placedTiles from Game.ts
    this.placedTiles = initialTiles;
  }

  /**
   * Keep the placedTiles in sync with the AppState after placement/removal.
   */
  updatePlacedTiles(newTiles: Tile[]): void {
    this.placedTiles = newTiles;
  }

  /**
   * Searches for buildings by their customName (case-insensitive).
   * Returns a simple object containing the matched name so the UI can show it.
   */
  search(query: string): { name: string }[] {
    const lowerQuery = query.toLowerCase();
    return this.placedTiles
      .filter((tile) => {
        // Only match if tile has a customName and it contains the query
        return (
          tile.customName && tile.customName.toLowerCase().includes(lowerQuery)
        );
      })
      .map((tile) => {
        // Return something the SearchUI can display
        return { name: tile.customName! };
      });
  }
}
