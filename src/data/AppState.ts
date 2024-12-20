import { Tile, SelectedTool, CameraState } from "./types";

export class AppState {
  placedTiles: Tile[] = [];
  camera: CameraState = {
    offset: { x: 0, y: 0 },
    scale: 1,
  };
  bearTrapPosition: { x: number; y: number } | null = null;
  selectedTool: SelectedTool = { type: null, size: 1 };
  cityNames: string[] = [];
  nameAssignments: Record<string, string> = {};
  isInPlacementMode = false;
  previewTile: Tile | null = null;
  colorMin = 2;
  colorMax = 6;
}
