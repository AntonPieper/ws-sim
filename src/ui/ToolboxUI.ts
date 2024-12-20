import { ToolEvents } from "../data/events";
import { SelectedTool, TileType } from "../data/types";
import { EventBus } from "../EventBus";

export function initializeToolbox(
  toolboxId: string,
  eventBus: EventBus<ToolEvents>
) {
  const selectedTool: SelectedTool = { type: null, size: 1 };
  const toolbox = document.getElementById(toolboxId);
  if (!toolbox) {
    throw new Error(`Toolbox element with ID "${toolboxId}" not found.`);
  }
  const toolboxElement = toolbox;

  function initializeTools(): void {
    for (const tool of toolboxElement.getElementsByClassName("tool")) {
      tool.addEventListener("click", (e) => {
        const tool = e.currentTarget as HTMLElement;
        const type = tool.getAttribute("data-type") as TileType | null;
        const sizeAttr = tool.getAttribute("data-size");
        const size = sizeAttr ? parseInt(sizeAttr, 10) : 1;
        eventBus.emit("tool:select", { type, size });
      });
    }
  }

  function selectTool(tool: SelectedTool): void {
    const sizeString = String(tool.size);
    for (const element of toolboxElement.querySelectorAll<HTMLElement>(
      ".tool"
    )) {
      element.classList.remove("selected");
      if (
        element.getAttribute("data-type") === tool.type &&
        element.getAttribute("data-size") === sizeString
      ) {
        element.classList.add("selected");
      }
    }
    selectedTool.size = tool.size;
    selectedTool.type = tool.type;
  }

  initializeTools();
  eventBus.on("tool:select", selectTool);

  return selectTool;
}
