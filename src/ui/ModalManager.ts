export class ModalManager {
  private modal: HTMLDivElement;
  private cityNamesInput: HTMLTextAreaElement;
  private colorMinInput: HTMLInputElement;
  private colorMaxInput: HTMLInputElement;
  private saveBtn: HTMLButtonElement;
  private closeBtn: HTMLButtonElement;

  private onSaveCallback: (
    cityNames: string[],
    colorMin: number,
    colorMax: number
  ) => void;

  constructor(
    modalId: string,
    saveBtnId: string,
    closeBtnId: string,
    onSave: (cityNames: string[], colorMin: number, colorMax: number) => void
  ) {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) {
      throw new Error(`Modal element with ID "${modalId}" not found.`);
    }
    this.modal = modalElement as HTMLDivElement;

    this.cityNamesInput = document.getElementById(
      "cityNamesInput"
    ) as HTMLTextAreaElement;
    this.colorMinInput = document.getElementById(
      "colorMin"
    ) as HTMLInputElement;
    this.colorMaxInput = document.getElementById(
      "colorMax"
    ) as HTMLInputElement;
    this.saveBtn = document.getElementById(saveBtnId) as HTMLButtonElement;
    this.closeBtn = document.getElementById(closeBtnId) as HTMLButtonElement;

    this.onSaveCallback = onSave;
    this.initializeEvents();
  }

  private initializeEvents() {
    this.saveBtn.addEventListener("click", () => this.save());
    this.closeBtn.addEventListener("click", () => this.hide());
  }

  private save() {
    const cityNames = this.cityNamesInput.value
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n !== "");
    const colorMin = parseFloat(this.colorMinInput.value) || 2;
    const colorMax = parseFloat(this.colorMaxInput.value) || 6;
    this.onSaveCallback(cityNames, colorMin, colorMax);
    this.hide();
  }

  show() {
    this.modal.style.display = "block";
  }

  hide() {
    this.modal.style.display = "none";
  }
}
