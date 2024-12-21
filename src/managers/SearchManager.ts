// src/managers/SearchManager.ts

import { NameAssignment } from "../data/types";

export class SearchManager {
  private nameAssignments: NameAssignment[];

  constructor(nameAssignments: NameAssignment[]) {
    this.nameAssignments = nameAssignments;
  }

  /**
   * Updates the list of name assignments.
   * @param nameAssignments The updated list of name assignments.
   */
  updateNameAssignments(nameAssignments: NameAssignment[]): void {
    this.nameAssignments = nameAssignments;
  }

  /**
   * Searches for buildings by name.
   * @param query The search query.
   * @returns An array of matching NameAssignments.
   */
  search(query: string): NameAssignment[] {
    const lowerQuery = query.toLowerCase();
    return this.nameAssignments.filter((assignment) =>
      assignment.name.toLowerCase().includes(lowerQuery),
    );
  }
}
