export interface CameraController {
  getDragDistance(): number;
  getDragThreshold(): number;
  centerOnTile(tileX: number, tileY: number, tileSize: number): void;
}
