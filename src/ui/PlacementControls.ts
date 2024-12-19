export class PlacementControls {
  private container: HTMLDivElement | null = null;
  private confirmBtn: HTMLButtonElement | null = null;
  private cancelBtn: HTMLButtonElement | null = null;

  show(canPlace: boolean, onConfirm: () => void, onCancel: () => void): void {
    this.hide();
    this.container = document.createElement("div");
    this.container.id = "placement-controls";
    this.container.classList.add("placement-controls");

    this.confirmBtn = document.createElement("button");
    this.confirmBtn.textContent = "✔";
    this.confirmBtn.style.color = "green";
    this.confirmBtn.disabled = !canPlace;
    this.confirmBtn.addEventListener("click", onConfirm);

    this.cancelBtn = document.createElement("button");
    this.cancelBtn.textContent = "X";
    this.cancelBtn.style.color = "red";
    this.cancelBtn.addEventListener("click", onCancel);

    this.container.appendChild(this.confirmBtn);
    this.container.appendChild(this.cancelBtn);
    document.body.appendChild(this.container);
  }

  hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.confirmBtn = null;
      this.cancelBtn = null;
    }
  }

  updateConfirmState(canPlace: boolean): void {
    if (this.confirmBtn) {
      this.confirmBtn.disabled = !canPlace;
      this.confirmBtn.style.opacity = canPlace ? "1.0" : "0.5";
      this.confirmBtn.style.cursor = canPlace ? "pointer" : "not-allowed";
    }
  }
}
