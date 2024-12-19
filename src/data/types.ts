export type TileType =
  | "bear_trap"
  | "headquarter"
  | "city"
  | "banner"
  | "resource"
  | "eraser";

export interface Position {
  x: number;
  y: number;
}

export interface Tile {
  x: number;
  y: number;
  type: TileType;
  size: number;
}

export interface SelectedTool {
  type: TileType | null;
  size: number;
}
