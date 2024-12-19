import { Tile, SelectedTool } from "./types";

export class AppState {
  placedTiles: Tile[] = [];
  bearTrapPosition: { x: number; y: number } | null = null;
  selectedTool: SelectedTool = { type: null, size: 1 };
  cityNames: string[] = [];
  nameAssignments: Record<string, string> = {};
  isInPlacementMode = false;
  previewTile: Tile | null = null;
  offset = { x: 0, y: 0 };
  cameraScale = 1;
  colorMin = 2;
  colorMax = 6;
}
