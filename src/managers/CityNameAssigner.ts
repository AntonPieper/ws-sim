import { Tile, Position, NameAssignment } from "../data/types";
import { calculateDistance } from "../utils/utils";

export class CityNameAssigner {
  private lastBearTrapPos?: Position;
  private cachedAssignments?: Record<string, NameAssignment>;

  assignNames(
    placedTiles: Tile[],
    cityNames: string[],
    bearTrapPosition: Position | null,
  ): Record<string, NameAssignment> {
    if (!bearTrapPosition) {
      return {};
    }

    // If the bear trap hasn't moved, and the placedTiles haven't changed,
    // we could theoretically reuse cached assignments. Here’s a naive check:
    if (
      this.lastBearTrapPos &&
      this.lastBearTrapPos.x === bearTrapPosition.x &&
      this.lastBearTrapPos.y === bearTrapPosition.y &&
      this.cachedAssignments
    ) {
      return this.cachedAssignments;
    }

    // Otherwise, recalc:
    const assignments: Record<string, NameAssignment> = {};

    const cities = placedTiles.filter((t) => t.type === "city");
    // Sort once by distance
    cities.sort((a, b) => {
      const distA = calculateDistance(
        a.x + a.size / 2,
        a.y + a.size / 2,
        bearTrapPosition.x,
        bearTrapPosition.y,
      );
      const distB = calculateDistance(
        b.x + b.size / 2,
        b.y + b.size / 2,
        bearTrapPosition.x,
        bearTrapPosition.y,
      );
      return distA - distB;
    });

    // Assign names
    cities.forEach((city, index) => {
      if (index < cityNames.length) {
        assignments[`${city.x},${city.y}`] = {
          name: cityNames[index],
          position: { x: city.x, y: city.y },
        };
      }
    });

    // Cache and remember
    this.lastBearTrapPos = { ...bearTrapPosition };
    this.cachedAssignments = assignments;
    return assignments;
  }
}
