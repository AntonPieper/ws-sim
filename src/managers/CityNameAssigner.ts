import { Tile, Position, NameAssignment } from "../data/types";
import { calculateDistance } from "../utils/utils";

export class CityNameAssigner {
  assignNames(
    placedTiles: Tile[],
    cityNames: string[],
    bearTrapPosition: Position | null,
  ) {
    const assignments: Record<string, NameAssignment> = {};
    if (!bearTrapPosition) return assignments;

    const cities = placedTiles.filter((t) => t.type === "city");
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

    cities.forEach((city, index) => {
      if (index < cityNames.length) {
        assignments[`${city.x},${city.y}`] = {
          name: cityNames[index],
          position: { x: city.x, y: city.y },
        };
      }
    });

    return assignments;
  }
}
