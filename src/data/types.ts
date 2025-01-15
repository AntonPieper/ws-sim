export type TileType =
  | "bear_trap"
  | "headquarter"
  | "city"
  | "banner"
  | "resource"
  | "eraser"
  | "block"; // (added "block" if you want that)

export interface Position {
  x: number;
  y: number;
}

/**
 * Updated Tile with an optional customName field
 */
export interface Tile {
  x: number;
  y: number;
  type: TileType;
  size: number;

  // For user-assigned or edited building names
  customName?: string;
}

export interface SelectedTool {
  type: TileType | null;
  size: number;
}

export interface CameraState {
  offset: Position;
  scale: number;
}
