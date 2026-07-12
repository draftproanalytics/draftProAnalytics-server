// src/modules/roster/domain/entities/rosterPlayer.entity.ts

export interface RosterPlayerProps {
  id: string
  teamId: number
  playerId: string | null
  playerName: string
  position: string
  positionGroup: string
  depthChartOrder: number
  age: number
  yearsExperience: number
  performanceGrade: number
  isStarter: boolean
  contractYearsRemaining: number
  injuryStatus: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export class RosterPlayer {
  private constructor(private readonly props: RosterPlayerProps) {}

  static create(props: RosterPlayerProps): RosterPlayer {
    return new RosterPlayer(props)
  }

  static reconstitute(props: RosterPlayerProps): RosterPlayer {
    return new RosterPlayer(props)
  }

  get id(): string {
    return this.props.id
  }

  get teamId(): number {
    return this.props.teamId
  }

  get playerId(): string | null {
    return this.props.playerId
  }

  get playerName(): string {
    return this.props.playerName
  }

  get position(): string {
    return this.props.position
  }

  get positionGroup(): string {
    return this.props.positionGroup
  }

  get depthChartOrder(): number {
    return this.props.depthChartOrder
  }

  get age(): number {
    return this.props.age
  }

  get yearsExperience(): number {
    return this.props.yearsExperience
  }

  get performanceGrade(): number {
    return this.props.performanceGrade
  }

  get isStarter(): boolean {
    return this.props.isStarter
  }

  get contractYearsRemaining(): number {
    return this.props.contractYearsRemaining
  }

  get injuryStatus(): string | null {
    return this.props.injuryStatus
  }

  get notes(): string | null {
    return this.props.notes
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  updateDepthChartOrder(order: number): void {
    if (order < 1) {
      throw new Error('Depth chart order must be at least 1')
    }
    this.props.depthChartOrder = order
  }

  updatePerformanceGrade(grade: number): void {
    if (grade < 0 || grade > 100) {
      throw new Error('Performance grade must be between 0 and 100')
    }
    this.props.performanceGrade = grade
  }

  setAsStarter(): void {
    this.props.isStarter = true
    this.props.depthChartOrder = 1
  }

  updateInjuryStatus(status: string | null): void {
    this.props.injuryStatus = status
  }

  updateContractYearsRemaining(years: number): void {
    if (years < 0) {
      throw new Error('Contract years remaining cannot be negative')
    }
    this.props.contractYearsRemaining = years
  }

  toObject(): RosterPlayerProps {
    return { ...this.props }
  }
}