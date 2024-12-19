import { Container, Graphics } from "pixi.js";
import { GRID_SIZE } from "../data/constants";

export function createGrid(): Container {
  const container = new Container();
  const size = 100;
  for (let i = -size; i <= size; i++) {
    // Vertical line
    const vLine = new Graphics();
    vLine
      .moveTo(i * GRID_SIZE, -size * GRID_SIZE)
      .lineTo(i * GRID_SIZE, size * GRID_SIZE)
      .stroke({ width: 1, color: 0xdddddd });
    container.addChild(vLine);

    // Horizontal line
    const hLine = new Graphics();
    hLine
      .moveTo(-size * GRID_SIZE, i * GRID_SIZE)
      .lineTo(size * GRID_SIZE, i * GRID_SIZE)
      .stroke({ width: 1, color: 0xdddddd });
    container.addChild(hLine);
  }
  return container;
}
