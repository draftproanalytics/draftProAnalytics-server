// src/modules/draft-analysis/domain/entities/LiveDraftPick.entity.ts
import { PositionGroup } from '../value-objects/PositionGroup.vo';
import { DraftGrade } from '../value-objects/DraftGrade.vo';

export type DraftPickStatus = 'upcoming' | 'current' | 'completed' | 'traded';

export class LiveDraftPick {
  constructor(
    public readonly id: string,
    public readonly year: number,
    public readonly round: number,
    public readonly pick: number,
    public readonly overallPick: number,
    public readonly teamId: string,
    public readonly originalTeamId: string,
    public status: DraftPickStatus,
    public playerName?: string,
    public position?: PositionGroup,
    public college?: string,
    public consensusRanking?: number,
    public grade?: DraftGrade,
    public pickedAt?: Date
  ) {}

  markAsCompleted(
    playerName: string,
    position: PositionGroup,
    college: string,
    grade: DraftGrade
  ): void {
    this.playerName = playerName;
    this.position = position;
    this.college = college;
    this.grade = grade;
    this.status = 'completed';
    this.pickedAt = new Date();
  }

  markAsCurrent(): void {
    this.status = 'current';
  }

  isCompleted(): boolean {
    return this.status === 'completed';
  }

  isTraded(): boolean {
    return this.teamId !== this.originalTeamId;
  }

  getGradeValue(): number {
    return this.grade?.score ?? 0;
  }
}