import { CameraState, SelectedTool, Tile } from "./types";

export class AppState {
  placedTiles: Tile[] = [];
  camera: CameraState = {
    offset: { x: 0, y: 0 },
    scale: 1,
  };

  /**
   * -1 = use min distance to all bear traps;
   * otherwise use that index in the array of bear traps
   */
  selectedTrapIndex: number = -1;

  selectedTool: SelectedTool = { type: null, size: 1 };
  isInPlacementMode = false;
  previewTile: Tile | null = null;

  // For color interpolation in drawTiles
  colorMin = 2;
  colorMax = 6;
}
