import { Container, Graphics } from "pixi.js";
import { GRID_SIZE } from "../data/constants";

export class GridRenderer {
  private container: Container;

  constructor(container: Container) {
    this.container = container;
    this.drawGrid();
  }

  private drawGrid() {
    const size = 100;
    for (let i = -size; i <= size; i++) {
      // Vertical line
      const vLine = new Graphics();
      vLine
        .moveTo(i * GRID_SIZE, -size * GRID_SIZE)
        .lineTo(i * GRID_SIZE, size * GRID_SIZE)
        .stroke({ width: 1, color: 0xdddddd });
      this.container.addChild(vLine);

      // Horizontal line
      const hLine = new Graphics();
      hLine
        .moveTo(-size * GRID_SIZE, i * GRID_SIZE)
        .lineTo(size * GRID_SIZE, i * GRID_SIZE)
        .stroke({ width: 1, color: 0xdddddd });
      this.container.addChild(hLine);
    }
  }
}
