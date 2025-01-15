export class PlacementControls {
  private container: HTMLDivElement | null = null;
  private confirmBtn: HTMLButtonElement | null = null;
  private cancelBtn: HTMLButtonElement | null = null;
  private nameInput: HTMLInputElement | null = null;

  /**
   * Called by PlacementManager to create & show the controls
   */
  show(
    canPlace: boolean,
    options: {
      name?: string;
      onConfirm: () => void;
      onCancel: () => void;
      onNameChange: (newName: string) => void;
    },
  ): void {
    this.hide();

    this.container = document.createElement("div");
    this.container.id = "placement-controls";
    this.container.classList.add("placement-controls");

    // The name input
    this.nameInput = document.createElement("input");
    this.nameInput.type = "text";
    this.nameInput.placeholder = "Name...";
    if (options.name !== undefined) {
      this.nameInput.value = options.name;
    }
    this.nameInput.style.width = "120px";
    this.nameInput.style.marginRight = "10px";

    this.nameInput.addEventListener("input", () => {
      options.onNameChange(this.nameInput!.value);
    });

    this.confirmBtn = document.createElement("button");
    this.confirmBtn.textContent = "✔";
    this.confirmBtn.style.color = "green";
    this.confirmBtn.disabled = !canPlace;
    this.confirmBtn.addEventListener("click", options.onConfirm);

    this.cancelBtn = document.createElement("button");
    this.cancelBtn.textContent = "X";
    this.cancelBtn.style.color = "red";
    this.cancelBtn.addEventListener("click", options.onCancel);

    this.container.appendChild(this.nameInput);
    this.container.appendChild(this.confirmBtn);
    this.container.appendChild(this.cancelBtn);

    document.body.appendChild(this.container);
  }

  /**
   * Hide and remove controls
   */
  hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.confirmBtn = null;
      this.cancelBtn = null;
      this.nameInput = null;
    }
  }

  /**
   * Called by the manager to enable/disable the Confirm button
   */
  updateConfirmState(canPlace: boolean): void {
    if (this.confirmBtn) {
      this.confirmBtn.disabled = !canPlace;
      this.confirmBtn.style.opacity = canPlace ? "1.0" : "0.5";
      this.confirmBtn.style.cursor = canPlace ? "pointer" : "not-allowed";
    }
  }

  /**
   * Manager can call this to keep the name input updated
   */
  setPreviewName(name: string): void {
    if (this.nameInput) {
      this.nameInput.value = name;
    }
  }

  /**
   * Manager can read the name from the input whenever needed
   */
  getPreviewName(): string {
    if (this.nameInput) {
      return this.nameInput.value.trim();
    }
    return "";
  }
}
