import { CameraState, SelectedTool } from "./types";
import { Tile } from "./types";

export interface ToolEvents {
  "tool:select"(selectedTool: SelectedTool): void;
}

export interface ConfigEvents {
  "config:loaded"(): void;
}

export interface ConfigEvents {
  "config:saved"(configName: string): void;
}

export interface ModalEvents {
  "modal:opened"(): void;
}

export interface CameraEvents {
  "camera:move"(cameraState: CameraState): void;
  "camera:moved"(cameraState: CameraState): void;
  "camera:click"(globalX: number, globalY: number): void;
}

/** NEW interface for tile events */
export interface TileEvents {
  "tile:placed"(tile: Tile): void;
  "tile:removed"(tile: Tile): void;
}

/** Merge them into AllEvents */
export interface AllEvents
  extends ToolEvents,
    ConfigEvents,
    ModalEvents,
    CameraEvents,
    TileEvents {}
