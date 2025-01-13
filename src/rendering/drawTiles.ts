import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { AppState } from "../data/AppState";
import { Tile } from "../data/types";
import { GRID_SIZE, BANNER_ZONE_COLORS } from "../data/constants";
import { calculateDistance, interpolateColor } from "../utils/utils";

export function drawTiles(
  container: Container,
  state: AppState,
  zones: Set<string>[]
) {
  for (const tile of state.placedTiles) {
    drawSingleTile(container, tile, false, state, zones);
  }
}

export function drawPreviewTile(
  container: Container,
  state: AppState,
  zones: Set<string>[]
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
  zones: Set<string>[]
) {
  const size = tile.size * GRID_SIZE;
  const x = tile.x * GRID_SIZE;
  const y = tile.y * GRID_SIZE;
  const g = new Graphics();

  // Determine fill color
  let fillColor: [number, number, number] = [204, 204, 204]; // default gray
  if (tile.type === "bear_trap") {
    fillColor = [248, 136, 136];
  } else if (tile.type === "headquarter") {
    fillColor = [136, 255, 255];
  } else if (tile.type === "city") {
    // Color by distance to bear trap
    if (state.bearTrapPosition) {
      const dist = calculateDistance(
        tile.x + tile.size / 2,
        tile.y + tile.size / 2,
        state.bearTrapPosition.x,
        state.bearTrapPosition.y
      );
      const [r, g, b] = interpolateColor(
        [0, 255, 0],
        [255, 0, 0],
        state.colorMin,
        state.colorMax,
        dist
      );
      fillColor = [r, g, b];
    } else {
      fillColor = [136, 248, 136];
    }
  } else if (tile.type === "banner") {
    fillColor = [136, 136, 248];
  } else if (tile.type === "resource") {
    fillColor = [255, 255, 136];
  }

  if (fillColor == null) {
    throw new Error("Invalid tile type");
  } else if (fillColor.length !== 3) {
    throw new Error("Invalid fill color");
  }

  const alpha = isPreview ? 0.3 : 1.0;
  const fillHex = (fillColor[0] << 16) + (fillColor[1] << 8) + fillColor[2];
  if (Number.isNaN(fillHex)) {
    throw new Error("Invalid fill color");
  }
  // Draw the base rect
  g.rect(x, y, size, size).fill({ color: fillHex, alpha });

  // Check territory coverage
  const { inZone, zoneColor } = findTerritoryCoverage(tile, zones);

  if (inZone && zoneColor) {
    // If inside territory, outline with territory color
    g.stroke({ width: inZone ? 4 : 2, color: zoneColor });
  } else if (
    !inZone &&
    !isPreview &&
    tile.type !== "bear_trap" &&
    tile.type !== "eraser"
  ) {
    // Not inside territory, draw a red X
    g.moveTo(x, y).lineTo(x + size, y + size);
    g.moveTo(x + size, y).lineTo(x, y + size);
    g.stroke({ width: 2, color: 0xff0000 });
  }

  // Add building label
  const label =
    tile.type === "city" && state.nameAssignments[`${tile.x},${tile.y}`]
      ? state.nameAssignments[`${tile.x},${tile.y}`].name
      : tile.type || "";

  const labelText = new Text({
    text: label,
    rotation: Math.PI / 4, // 45 degrees
    style: new TextStyle({
      fontFamily: "Arial",
      fontSize: 16,
      fill: "#000000",
      align: "center",
    }),
  });
  labelText.anchor.set(0.5);
  labelText.position.set(x + size / 2, y + size / 2);
  g.addChild(labelText);

  // If city and bearTrapPosition, show distance below name
  if (tile.type === "city" && state.bearTrapPosition) {
    const dist = calculateDistance(
      tile.x + tile.size / 2,
      tile.y + tile.size / 2,
      state.bearTrapPosition.x,
      state.bearTrapPosition.y
    );
    const distText = new Text({
      text: `${dist.toFixed(2)} units`,
      rotation: Math.PI / 4, // 45 degrees
      style: new TextStyle({
        fontFamily: "Arial",
        fontSize: 12,
        fill: "#000000",
        align: "center",
      }),
    });
    distText.anchor.set(0.5);
    distText.position.set(x + size / 2 - 10, y + size / 2 + 10); // a bit below the name
    g.addChild(distText);
  }

  container.addChild(g);
}

// Helpers

function findTerritoryCoverage(
  tile: Tile,
  zones: Set<string>[]
): { inZone: boolean; zoneColor: number | null } {
  const totalCells = tile.size * tile.size;
  let bestZoneIndex = -1;
  let bestCoverage = 0;

  for (let i = 0; i < zones.length; i++) {
    let coverage = 0;
    for (let dx = 0; dx < tile.size; dx++) {
      for (let dy = 0; dy < tile.size; dy++) {
        const cellKey = `${tile.x + dx},${tile.y + dy}`;
        if (zones[i].has(cellKey)) coverage++;
      }
    }
    if (coverage > bestCoverage) {
      bestCoverage = coverage;
      bestZoneIndex = i;
    }
  }

  const coverageRatio = bestCoverage / (totalCells || 1);
  if (coverageRatio >= 0.75 && bestZoneIndex >= 0) {
    // territory color
    const { r, g, b } =
      BANNER_ZONE_COLORS[bestZoneIndex % BANNER_ZONE_COLORS.length];
    const color = (r << 16) + (g << 8) + b;
    return { inZone: true, zoneColor: color };
  }
  return { inZone: false, zoneColor: null };
}
