import { Container, Graphics, Text } from "pixi.js";
import { AppState } from "../data/AppState";
import { BANNER_ZONE_COLORS, GRID_SIZE } from "../data/constants";
import { Tile } from "../data/types";
import { calculateDistance, interpolateColor } from "../utils/utils";

export function drawTiles(
  container: Container,
  state: AppState,
  zones: Set<string>[],
) {
  for (const tile of state.placedTiles) {
    drawSingleTile(container, tile, false, state, zones);
  }
}

export function drawPreviewTile(
  container: Container,
  state: AppState,
  zones: Set<string>[],
) {
  if (state.previewTile) {
    drawSingleTile(container, state.previewTile, true, state, zones);
  }
}

function drawSingleTile(
  container: Container,
  tile: Tile,
  isPreview: boolean,
  state: AppState,
  zones: Set<string>[],
) {
  const size = tile.size * GRID_SIZE;
  const x = tile.x * GRID_SIZE;
  const y = tile.y * GRID_SIZE;

  // Draw base rect
  const g = new Graphics();
  const fillColor = getFillColor(tile, state);
  const alpha = isPreview ? 0.3 : 1.0;
  g.rect(x, y, size, size).fill({ color: fillColor, alpha });
  container.addChild(g);

  // Territory outline
  const { inZone, zoneColor } = findTerritoryCoverage(tile, zones);
  if (inZone && zoneColor) {
    g.rect(x, y, size, size).stroke({ width: 4, color: zoneColor });
  } else if (
    !inZone &&
    !isPreview &&
    tile.type !== "bear_trap" &&
    tile.type !== "eraser"
  ) {
    // Not in zone => draw X
    g.moveTo(x, y).lineTo(x + size, y + size);
    g.moveTo(x + size, y).lineTo(x, y + size);
    g.stroke({ width: 2, color: 0xff0000 });
  }

  // Name label = customName or fallback
  const label = tile.customName || tile.type;
  const labelText = new Text({
    text: label,
    style: {
      fontFamily: "Arial",
      fontSize: 16,
      fill: 0x000000,
      align: "center",
    },
  });
  labelText.rotation = Math.PI / 4;
  labelText.anchor.set(0.5);
  labelText.position.set(x + size / 2, y + size / 2);
  g.addChild(labelText);

  // If city => show distance info
  if (tile.type === "city") {
    const bearTraps = state.placedTiles.filter((t) => t.type === "bear_trap");
    if (bearTraps.length > 0) {
      const { dist, index } = getBearTrapDistance(tile, bearTraps, state);
      const bearTrapName = bearTraps[index].customName ?? `#${index + 1}`;
      const distText = new Text({
        text: `${dist.toFixed(2)} (${bearTrapName})`,
        style: {
          fontFamily: "Arial",
          fontSize: 12,
          fill: 0x000000,
          align: "center",
        },
      });
      distText.rotation = Math.PI / 4;
      distText.anchor.set(0.5);
      distText.position.set(x + size / 2 - 10, y + size / 2 + 10);
      g.addChild(distText);
    }
  }
}

/**
 * Decide fill color for the tile based on type and distance to a trap if city
 */
function getFillColor(tile: Tile, state: AppState): number {
  if (tile.type === "bear_trap") {
    return 0xf88888; // light red
  } else if (tile.type === "headquarter") {
    return 0x88ffff; // light cyan
  } else if (tile.type === "city") {
    const traps = state.placedTiles.filter((t) => t.type === "bear_trap");
    if (traps.length > 0) {
      const { dist } = getBearTrapDistance(tile, traps, state);
      const [r, g, b] = interpolateColor(
        [0, 255, 0],
        [255, 0, 0],
        state.colorMin,
        state.colorMax,
        dist,
      );
      return (r << 16) + (g << 8) + b;
    }
    return 0x88f888; // default green
  } else if (tile.type === "banner") {
    return 0x8888f8; // bluish
  } else if (tile.type === "resource") {
    return 0xffff88; // yellowish
  } else if (tile.type === "block") {
    return 0xcccccc; // gray
  }
  return 0xcccccc;
}

/**
 * If selectedTrapIndex = -1 => use min distance, else use the chosen trap index
 */
function getBearTrapDistance(tile: Tile, traps: Tile[], state: AppState) {
  const cx = tile.x + tile.size / 2;
  const cy = tile.y + tile.size / 2;

  let chosenDist = Infinity;
  let chosenIndex = -1;

  if (state.selectedTrapIndex === -1) {
    // Min distance
    traps.forEach((t, i) => {
      const dist = calculateDistance(
        cx,
        cy,
        t.x + t.size / 2,
        t.y + t.size / 2,
      );
      if (dist < chosenDist) {
        chosenDist = dist;
        chosenIndex = i;
      }
    });
  } else {
    // Specific index
    const i = state.selectedTrapIndex;
    if (i >= 0 && i < traps.length) {
      chosenDist = calculateDistance(
        cx,
        cy,
        traps[i].x + traps[i].size / 2,
        traps[i].y + traps[i].size / 2,
      );
      chosenIndex = i;
    }
  }

  return { dist: chosenDist, index: chosenIndex };
}

function findTerritoryCoverage(tile: Tile, zones: Set<string>[]) {
  const total = tile.size * tile.size;
  let bestCoverage = 0;
  let bestZoneIndex = -1;

  for (let i = 0; i < zones.length; i++) {
    let coverage = 0;
    for (let dx = 0; dx < tile.size; dx++) {
      for (let dy = 0; dy < tile.size; dy++) {
        if (zones[i].has(`${tile.x + dx},${tile.y + dy}`)) {
          coverage++;
        }
      }
    }
    if (coverage > bestCoverage) {
      bestCoverage = coverage;
      bestZoneIndex = i;
    }
  }

  const coverageRatio = bestCoverage / (total || 1);
  if (coverageRatio >= 0.75 && bestZoneIndex >= 0) {
    const c = BANNER_ZONE_COLORS[bestZoneIndex % BANNER_ZONE_COLORS.length];
    const color = (c.r << 16) + (c.g << 8) + c.b;
    return { inZone: true, zoneColor: color };
  }
  return { inZone: false, zoneColor: null };
}
