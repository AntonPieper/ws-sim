import { SearchManager } from "../managers/SearchManager";

export class SearchUI {
  private buildingSearch: HTMLInputElement;
  private searchResults: HTMLDivElement;

  constructor(
    private searchManager: SearchManager,
    private jumpToBuilding: (name: string) => void
  ) {
    this.buildingSearch = document.getElementById(
      "buildingSearch"
    ) as HTMLInputElement;
    this.searchResults = document.getElementById(
      "searchResults"
    ) as HTMLDivElement;

    this.initializeSearchListeners();
  }

  private initializeSearchListeners(): void {
    // Debounce
    const debounce = (func: Function, wait: number) => {
      let timeout: number;
      return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => func(...args), wait);
      };
    };

    this.buildingSearch.addEventListener(
      "input",
      debounce((event: Event) => this.handleSearchInput(event), 100)
    );
    this.buildingSearch.addEventListener("focus", (event) => {
      this.handleSearchInput(event);
    });

    // Hide search results when clicking outside
    document.addEventListener("click", (e) => {
      if (!document.getElementById("searchPanel")!.contains(e.target as Node)) {
        this.searchResults.style.display = "none";
      }
    });
  }

  private handleSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input.value.trim();
    const matches = this.searchManager.search(query);

    if (matches.length === 0) {
      this.searchResults.innerHTML =
        "<div class='search-result-item'>No results found</div>";
      this.searchResults.style.display = "block";
      return;
    }

    this.searchResults.innerHTML = "";
    matches.forEach((assignment) => {
      const div = document.createElement("div");
      div.classList.add("search-result-item");
      div.textContent = assignment.name;
      div.addEventListener("click", () => {
        this.jumpToBuilding(assignment.name);
        this.searchResults.style.display = "none";
      });
      this.searchResults.appendChild(div);
    });

    this.searchResults.style.display = "block";
  }
}
