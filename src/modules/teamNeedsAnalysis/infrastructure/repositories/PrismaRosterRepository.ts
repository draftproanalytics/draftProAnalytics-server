// src/modules/teamNeedsAnalysis/infrastructure/repositories/PrismaRosterRepository.ts

import { PrismaClient } from '@prisma/client';
import { IRosterRepository } from '../../domain/repositories/IRosterRepository';
import { RosterPlayer } from '../../domain/services/RosterAnalyzer.service';

export class PrismaRosterRepository implements IRosterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByTeamId(teamId: number): Promise<RosterPlayer[]> {
    const rosterPlayers = await this.prisma.rosterPlayers.findMany({
      where: { teamId },
      orderBy: [
        { positionGroup: 'asc' },
        { position: 'asc' },
        { depthChartOrder: 'asc' },
      ],
    });

    return rosterPlayers.map(this.mapToRosterPlayer);
  }

  async findByPosition(teamId: number, position: string): Promise<RosterPlayer[]> {
    const rosterPlayers = await this.prisma.rosterPlayers.findMany({
      where: {
        teamId,
        position,
      },
      orderBy: { depthChartOrder: 'asc' },
    });

    return rosterPlayers.map(this.mapToRosterPlayer);
  }

  async findByPositionGroup(teamId: number, positionGroup: string): Promise<RosterPlayer[]> {
    const rosterPlayers = await this.prisma.rosterPlayers.findMany({
      where: {
        teamId,
        positionGroup,
      },
      orderBy: [{ position: 'asc' }, { depthChartOrder: 'asc' }],
    });

    return rosterPlayers.map(this.mapToRosterPlayer);
  }

  async findStarters(teamId: number): Promise<RosterPlayer[]> {
    const rosterPlayers = await this.prisma.rosterPlayers.findMany({
      where: {
        teamId,
        isStarter: true,
      },
      orderBy: [
        { positionGroup: 'asc' },
        { position: 'asc' },
      ],
    });

    return rosterPlayers.map(this.mapToRosterPlayer);
  }

  async getAllTeamIds(): Promise<number[]> {
    const teams = await this.prisma.team.findMany({
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    return teams.map((t) => t.id);
  }

  private mapToRosterPlayer(dbPlayer: any): RosterPlayer {
    return {
      position: dbPlayer.position,
      positionGroup: dbPlayer.positionGroup,
      depthChartOrder: dbPlayer.depthChartOrder,
      age: dbPlayer.age,
      yearsExperience: dbPlayer.yearsExperience,
      performanceGrade: Number(dbPlayer.performanceGrade),
      isStarter: dbPlayer.isStarter,
      contractYearsRemaining: dbPlayer.contractYearsRemaining,
      injuryStatus: dbPlayer.injuryStatus,
    };
  }
}