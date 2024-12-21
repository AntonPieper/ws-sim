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

export interface NameAssignment {
  name: string;
  position: Position;
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

export interface CameraState {
  offset: Position;
  scale: number;
}
