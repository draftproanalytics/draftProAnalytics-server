// src/modules/draft-analysis/infrastructure/repositories/PrismaLiveDraftPickRepository.ts
import { PrismaClient } from '@prisma/client';
import { ILiveDraftPickRepository } from '../../domain/repositories/ILiveDraftPickRepository';
import { LiveDraftPick } from '../../domain/entities/LiveDraftPick.entity';
import { PositionGroup } from '../../domain/value-objects/PositionGroup.vo';
import { DraftGrade } from '../../domain/value-objects/DraftGrade.vo';

export class PrismaLiveDraftPickRepository implements ILiveDraftPickRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<LiveDraftPick | null> {
    const pick = await this.prisma.liveDraftPicks.findUnique({
      where: { id }
    });

    return pick ? this.toDomain(pick) : null;
  }

  async findByDraftYear(year: number): Promise<LiveDraftPick[]> {
    const picks = await this.prisma.liveDraftPicks.findMany({
      where: { year },
      orderBy: { overallPick: 'asc' }
    });

    return picks.map(p => this.toDomain(p));
  }

  async findByTeam(teamId: string, year: number): Promise<LiveDraftPick[]> {
    const picks = await this.prisma.liveDraftPicks.findMany({
      where: {
        teamId: parseInt(teamId),
        year
      },
      orderBy: { overallPick: 'asc' }
    });

    return picks.map(p => this.toDomain(p));
  }

  async findByRound(year: number, round: number): Promise<LiveDraftPick[]> {
    const picks = await this.prisma.liveDraftPicks.findMany({
      where: {
        year,
        round
      },
      orderBy: { pick: 'asc' }
    });

    return picks.map(p => this.toDomain(p));
  }

  async findCurrentPick(year: number): Promise<LiveDraftPick | null> {
    const pick = await this.prisma.liveDraftPicks.findFirst({
      where: {
        year,
        status: 'current'
      }
    });

    return pick ? this.toDomain(pick) : null;
  }

  async save(pick: LiveDraftPick): Promise<LiveDraftPick> {
    const saved = await this.prisma.liveDraftPicks.create({
      data: this.toCreateData(pick)
    });

    return this.toDomain(saved);
  }

  async update(pick: LiveDraftPick): Promise<LiveDraftPick> {
    const updated = await this.prisma.liveDraftPicks.update({
      where: { id: pick.id },
      data: this.toUpdateData(pick)
    });

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.liveDraftPicks.delete({
      where: { id }
    });
  }

  async findAll(year: number): Promise<LiveDraftPick[]> {
    const picks = await this.prisma.liveDraftPicks.findMany({
      where: { year },
      orderBy: { overallPick: 'asc' }
    });

    return picks.map(p => this.toDomain(p));
  }

  private toDomain(prisma: any): LiveDraftPick {
    let grade: DraftGrade | undefined;
    
    if (prisma.gradeValue && prisma.gradeScore !== null) {
      grade = DraftGrade.instance(
        prisma.gradeValue,
        prisma.gradeScore,
        []
      );
    }

    return new LiveDraftPick(
      prisma.id,
      prisma.year,
      prisma.round,
      prisma.pick,
      prisma.overallPick,
      String(prisma.teamId), // Convert INT to string
      String(prisma.originalTeamId), // Convert INT to string
      prisma.status,
      prisma.playerName,
      prisma.position as PositionGroup | undefined,
      prisma.college,
      prisma.consensusRank,
      grade,
      prisma.pickedAt
    );
  }

  private toCreateData(domain: LiveDraftPick) {
    return {
      year: domain.year,
      round: domain.round,
      pick: domain.pick,
      overallPick: domain.overallPick,
      teamId: parseInt(domain.teamId),
      originalTeamId: parseInt(domain.originalTeamId),
      status: domain.status,
      playerName: domain.playerName,
      position: domain.position,
      college: domain.college,
      consensusRank: domain.consensusRanking,
      gradeValue: domain.grade?.grade ?? null,
      gradeScore: domain.grade?.score ?? null,
      expectedSuccess: domain.grade ? this.calculateExpectedSuccess(domain.grade.score) : null,
      pickedAt: domain.pickedAt
    };
  }

  private toUpdateData(domain: LiveDraftPick) {
    return {
      year: domain.year,
      round: domain.round,
      pick: domain.pick,
      overallPick: domain.overallPick,
      teamId: parseInt(domain.teamId),
      originalTeamId: parseInt(domain.originalTeamId),
      status: domain.status,
      playerName: domain.playerName,
      position: domain.position,
      college: domain.college,
      consensusRank: domain.consensusRanking,
      gradeValue: domain.grade?.grade ?? null,
      gradeScore: domain.grade?.score ?? null,
      expectedSuccess: domain.grade ? this.calculateExpectedSuccess(domain.grade.score) : null,
      pickedAt: domain.pickedAt
    };
  }

  private calculateExpectedSuccess(gradeScore: number): number {
    // Convert grade score (0-100) to expected success probability
    // This is a simplified calculation - you can adjust the formula
    return Math.min(100, Math.max(0, gradeScore));
  }
}