// src/managers/TerritoryManager.ts

import { Tile } from "../data/types";
import { createKey } from "../utils/utils";

export class TerritoryManager {
  private static BANNER_RADIUS = 3;

  computeBannerZones(tiles: Tile[], preview?: Tile): Set<string>[] {
    // Combine placed + preview if needed
    const allTiles = [...tiles];
    if (preview && preview.type === "banner") {
      allTiles.push(preview);
    }

    // Identify banner tiles
    const bannerTiles = allTiles.filter((t) => t.type === "banner");
    if (bannerTiles.length === 0) return [];

    // OPTIONAL: Union-Find approach as a possible optimization
    const zones = this.buildZonesUnionFind(bannerTiles);
    return zones;
  }

  /**
   * Build territory zones using a Union-Find structure.
   */
  private buildZonesUnionFind(bannerTiles: Tile[]): Set<string>[] {
    // 1) Each banner => its zone cells
    // 2) Use union-find to merge them if they overlap/touch
    const zonesArray = bannerTiles.map((tile) => {
      return this.createBannerZone(tile.x, tile.y);
    });

    // Flatten so we have a list of zone sets
    // Then do union if any sets overlap or touch
    return this.unionAllZones(zonesArray);
  }

  /**
   * Creates a zone around (bx, by).
   */
  private createBannerZone(bx: number, by: number): Set<string> {
    const zone = new Set<string>();
    // ±3 by default
    for (
      let dx = -TerritoryManager.BANNER_RADIUS;
      dx <= TerritoryManager.BANNER_RADIUS;
      dx++
    ) {
      for (
        let dy = -TerritoryManager.BANNER_RADIUS;
        dy <= TerritoryManager.BANNER_RADIUS;
        dy++
      ) {
        zone.add(createKey(bx + dx, by + dy));
      }
    }
    return zone;
  }

  /**
   * Example: merging sets either by repeated merging (like your original approach)
   * or by a true Union-Find. Here we do a straightforward repeated merging,
   * but you can swap in an actual Disjoint-Set if you want better scalability.
   */
  private unionAllZones(zones: Set<string>[]): Set<string>[] {
    let merged = true;
    while (merged) {
      merged = false;
      outer: for (let i = 0; i < zones.length; i++) {
        for (let j = i + 1; j < zones.length; j++) {
          if (this.zonesTouchOrOverlap(zones[i], zones[j])) {
            for (const cell of zones[j]) {
              zones[i].add(cell);
            }
            zones.splice(j, 1);
            merged = true;
            break outer;
          }
        }
      }
    }
    return zones;
  }

  /**
   * Checks if two zones overlap or are adjacent (i.e., within 1 cell).
   */
  private zonesTouchOrOverlap(a: Set<string>, b: Set<string>): boolean {
    // Overlap check
    for (const cell of a) {
      if (b.has(cell)) return true;
    }
    // Adjacency check
    // If these are large sets, you can short-circuit or use more advanced spatial indexing.
    for (const cell of a) {
      const [x, y] = cell.split(",").map(Number);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (b.has(createKey(x + dx, y + dy))) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
