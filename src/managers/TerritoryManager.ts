import { Tile } from "../data/types";
import { createKey } from "../utils/utils";

export class TerritoryManager {
  computeBannerZones(tiles: Tile[], preview?: Tile): Set<string>[] {
    const allTiles = [...tiles];
    if (preview && preview.type === "banner") {
      allTiles.push(preview);
    }

    const bannerTiles = allTiles.filter((t) => t.type === "banner");
    let zones = bannerTiles.map((banner) =>
      this.createBannerZone(banner.x, banner.y),
    );
    zones = this.mergeZones(zones);
    return zones;
  }

  private createBannerZone(bx: number, by: number): Set<string> {
    const zone = new Set<string>();
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        zone.add(createKey(bx + dx, by + dy));
      }
    }
    return zone;
  }

  private mergeZones(zones: Set<string>[]): Set<string>[] {
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

  private zonesTouchOrOverlap(a: Set<string>, b: Set<string>): boolean {
    // Check overlap
    for (const cell of a) if (b.has(cell)) return true;
    // Check adjacency
    for (const cell of a) {
      const [x, y] = cell.split(",").map(Number);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nx = x + dx,
            ny = y + dy;
          if (b.has(createKey(nx, ny))) return true;
        }
      }
    }
    return false;
  }
}
