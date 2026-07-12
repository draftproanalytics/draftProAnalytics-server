// src/modules/teamNeedsAnalysis/domain/value-objects/PositionGroup.vo.ts

export const POSITION_GROUPS = {
  OFFENSE: {
    QB: ['QB'],
    RB: ['RB', 'FB'],
    WR: ['WR'],
    TE: ['TE'],
    OL: ['C', 'G', 'T', 'OL'],
  },
  DEFENSE: {
    DL: ['DE', 'DT', 'NT', 'DL'],
    LB: ['LB', 'MLB', 'OLB'],
    DB: ['CB', 'S', 'FS', 'SS', 'DB'],
  },
  SPECIAL_TEAMS: {
    SPECIALISTS: ['K', 'P', 'LS'],
  },
} as const;

export class PositionGroup {
  private constructor(
    public readonly name: string,
    public readonly positions: readonly string[]
  ) {}

  static fromPosition(position: string): PositionGroup {
    // Find which group this position belongs to
    for (const [category, groups] of Object.entries(POSITION_GROUPS)) {
      for (const [groupName, positions] of Object.entries(groups)) {
        if (positions.includes(position)) {
          return new PositionGroup(groupName, positions);
        }
      }
    }

    throw new Error(`Unknown position: ${position}`);
  }

  static getGroupName(position: string): string {
    try {
      return PositionGroup.fromPosition(position).name;
    } catch {
      return 'UNKNOWN';
    }
  }

  containsPosition(position: string): boolean {
    return this.positions.includes(position);
  }

  isOffensive(): boolean {
    return Object.keys(POSITION_GROUPS.OFFENSE).includes(this.name);
  }

  isDefensive(): boolean {
    return Object.keys(POSITION_GROUPS.DEFENSE).includes(this.name);
  }

  isSpecialTeams(): boolean {
    return Object.keys(POSITION_GROUPS.SPECIAL_TEAMS).includes(this.name);
  }
}