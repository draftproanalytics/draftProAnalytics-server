// src/modules/roster/domain/value-objects/Position.vo.ts

/**
 * Position Value Object
 * Ensures position values are always valid
 */
export class Position {
  private static readonly VALID_POSITIONS = [
    'QB', 'RB', 'FB', 'WR', 'TE', 'OL', 'C', 'G', 'T',
    'DE', 'DT', 'NT', 'LB', 'MLB', 'OLB',
    'CB', 'S', 'FS', 'SS',
    'K', 'P', 'LS'
  ] as const

  private constructor(private readonly value: string) {}

  static create(position: string): Position {
    const normalized = position.toUpperCase()
    
    if (!this.VALID_POSITIONS.includes(normalized as any)) {
      throw new Error(`Invalid position: ${position}. Must be one of: ${this.VALID_POSITIONS.join(', ')}`)
    }

    return new Position(normalized)
  }

  getValue(): string {
    return this.value
  }

  getPositionGroup(): PositionGroup {
    return PositionGroup.fromPosition(this.value)
  }

  equals(other: Position): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  isOffensive(): boolean {
    return this.getPositionGroup().getValue() === 'OFF'
  }

  isDefensive(): boolean {
    return this.getPositionGroup().getValue() === 'DEF'
  }

  isSpecialTeams(): boolean {
    return this.getPositionGroup().getValue() === 'ST'
  }
}

/**
 * PositionGroup Value Object
 */
export class PositionGroup {
  private static readonly OFFENSE_POSITIONS = ['QB', 'RB', 'FB', 'WR', 'TE', 'OL', 'C', 'G', 'T']
  private static readonly DEFENSE_POSITIONS = ['DE', 'DT', 'NT', 'LB', 'MLB', 'OLB', 'CB', 'S', 'FS', 'SS']
  private static readonly SPECIAL_TEAMS_POSITIONS = ['K', 'P', 'LS']

  private static readonly VALID_GROUPS = ['OFF', 'DEF', 'ST'] as const

  private constructor(private readonly value: 'OFF' | 'DEF' | 'ST') {}

  static create(group: string): PositionGroup {
    const normalized = group.toUpperCase() as 'OFF' | 'DEF' | 'ST'
    
    if (!this.VALID_GROUPS.includes(normalized)) {
      throw new Error(`Invalid position group: ${group}. Must be one of: OFF, DEF, ST`)
    }

    return new PositionGroup(normalized)
  }

  static fromPosition(position: string): PositionGroup {
    const normalized = position.toUpperCase()

    if (this.OFFENSE_POSITIONS.includes(normalized)) {
      return new PositionGroup('OFF')
    }
    if (this.DEFENSE_POSITIONS.includes(normalized)) {
      return new PositionGroup('DEF')
    }
    if (this.SPECIAL_TEAMS_POSITIONS.includes(normalized)) {
      return new PositionGroup('ST')
    }

    throw new Error(`Cannot determine position group for: ${position}`)
  }

  getValue(): 'OFF' | 'DEF' | 'ST' {
    return this.value
  }

  getFullName(): string {
    switch (this.value) {
      case 'OFF': return 'Offense'
      case 'DEF': return 'Defense'
      case 'ST': return 'Special Teams'
    }
  }

  equals(other: PositionGroup): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}