import { CameraState, SelectedTool } from "./types";

export interface ToolEvents {
  "tool:select"(selectedTool: SelectedTool): void;
}

export interface ConfigEvents {
  "config:saved"(configName: string): void;
}

export interface ModalEvents {
  "modal:opened"(): void;
}

export interface CameraEvents {
  "camera:moved"(cameraState: CameraState): void;
  "camera:click"(globalX: number, globalY: number): void;
}

export interface AllEvents
  extends ToolEvents,
    ConfigEvents,
    ModalEvents,
    CameraEvents {}
