// src/modules/draft-analysis/infrastructure/mappers/HistoricalDraftPickMapper.ts
import { HistoricalDraftPick } from '../../domain/entities/HistoricalDraftPick.entity';
import { PositionGroup } from '../../domain/value-objects/PositionGroup.vo';

interface PrismaHistoricalDraftPick {
  id: string;
  year: number;
  round: number;
  pick: number;
  overallPick: number;
  teamId: number;
  playerName: string;
  position: string;
  positionGroup: string;
  college: string | null;
  careerGrade: string;
  yearsWithTeam: number;
  proBowls: number;
  allPros: number;
  gamesPlayed: number;
  gamesStarted: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class HistoricalDraftPickMapper {
  static toDomain(prisma: PrismaHistoricalDraftPick): HistoricalDraftPick {
    return new HistoricalDraftPick(
      prisma.id,
      prisma.year,
      prisma.round,
      prisma.pick,
      String(prisma.teamId), // Convert number to string for domain
      prisma.playerName,
      prisma.position,
      prisma.positionGroup as PositionGroup,
      prisma.careerGrade as HistoricalDraftPick['careerGrade'],
      prisma.yearsWithTeam,
      prisma.proBowls,
      prisma.allPros
    );
  }

  // For CREATE - exclude id, createdAt, updatedAt (auto-generated)
  static toCreateData(domain: HistoricalDraftPick, additionalData?: {
    college?: string;
    gamesPlayed?: number;
    gamesStarted?: number;
    notes?: string;
  }) {
    return {
      year: domain.year,
      round: domain.round,
      pick: domain.pick,
      overallPick: ((domain.round - 1) * 32) + domain.pick,
      teamId: parseInt(domain.teamId),
      playerName: domain.playerName,
      position: domain.position,
      positionGroup: domain.positionGroup,
      careerGrade: domain.careerGrade,
      yearsWithTeam: domain.yearsWithTeam,
      proBowls: domain.proBowl,
      allPros: domain.allPro,
      college: additionalData?.college ?? null,
      gamesPlayed: additionalData?.gamesPlayed ?? 0,
      gamesStarted: additionalData?.gamesStarted ?? 0,
      notes: additionalData?.notes ?? null
    };
  }

  // For UPDATE - exclude id, createdAt, updatedAt, and optional fields
  static toUpdateData(domain: HistoricalDraftPick) {
    return {
      year: domain.year,
      round: domain.round,
      pick: domain.pick,
      overallPick: ((domain.round - 1) * 32) + domain.pick,
      teamId: parseInt(domain.teamId),
      playerName: domain.playerName,
      position: domain.position,
      positionGroup: domain.positionGroup,
      careerGrade: domain.careerGrade,
      yearsWithTeam: domain.yearsWithTeam,
      proBowls: domain.proBowl,
      allPros: domain.allPro
    };
  }

  static toManyDomain(prismaList: PrismaHistoricalDraftPick[]): HistoricalDraftPick[] {
    return prismaList.map(p => this.toDomain(p));
  }
}