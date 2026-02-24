// src/modules/draft-analysis/infrastructure/repositories/PrismaTeamRosterRepository.ts
import { PrismaClient } from '@prisma/client';
import { 
  ITeamRosterRepository, 
  RosterPlayer, 
  PositionalDepth 
} from '../../domain/repositories/ITeamRosterRepository';
import { PositionGroup } from '../../domain/value-objects/PositionGroup.vo';

export class PrismaTeamRosterRepository implements ITeamRosterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByTeamId(teamId: string): Promise<RosterPlayer[]> {
    const players = await this.prisma.rosterPlayers.findMany({
      where: { teamId: parseInt(teamId) },
      orderBy: [
        { positionGroup: 'asc' },
        { depthChartOrder: 'asc' }
      ]
    });

    return players.map(p => this.toDomain(p));
  }

  async findByTeamAndPosition(
    teamId: string,
    position: PositionGroup
  ): Promise<RosterPlayer[]> {
    const players = await this.prisma.rosterPlayers.findMany({
      where: {
        teamId: parseInt(teamId),
        positionGroup: position
      },
      orderBy: { depthChartOrder: 'asc' }
    });

    return players.map(p => this.toDomain(p));
  }

  async findStarters(teamId: string): Promise<RosterPlayer[]> {
    const players = await this.prisma.rosterPlayers.findMany({
      where: {
        teamId: parseInt(teamId),
        isStarter: true
      },
      orderBy: { positionGroup: 'asc' }
    });

    return players.map(p => this.toDomain(p));
  }

  async findByDepthChart(
    teamId: string,
    position: PositionGroup
  ): Promise<RosterPlayer[]> {
    const players = await this.prisma.rosterPlayers.findMany({
      where: {
        teamId: parseInt(teamId),
        positionGroup: position
      },
      orderBy: { depthChartOrder: 'asc' }
    });

    return players.map(p => this.toDomain(p));
  }

  async getPositionalDepth(
    teamId: string,
    position: PositionGroup
  ): Promise<PositionalDepth> {
    const players = await this.findByTeamAndPosition(teamId, position);
    
    const starters = players.filter(p => p.isStarter);
    const backups = players.filter(p => !p.isStarter);
    
    const allAges = players.map(p => p.age);
    const averageAge = allAges.length > 0 
      ? allAges.reduce((sum, age) => sum + age, 0) / allAges.length 
      : 0;
    
    const allGrades = players.map(p => p.performanceGrade);
    const averagePerformance = allGrades.length > 0
      ? allGrades.reduce((sum, grade) => sum + grade, 0) / allGrades.length
      : 0;

    const needSeverity = this.calculateNeedSeverity(starters, backups, averageAge, averagePerformance);

    return {
      position,
      starters,
      backups,
      averageAge,
      averagePerformance,
      needSeverity
    };
  }

  async getAllPositionalDepths(teamId: string): Promise<PositionalDepth[]> {
    const positions = Object.values(PositionGroup);
    
    const depths = await Promise.all(
      positions.map(pos => this.getPositionalDepth(teamId, pos))
    );

    return depths.filter(d => d.starters.length > 0 || d.backups.length > 0);
  }

  async save(player: RosterPlayer): Promise<RosterPlayer> {
    const saved = await this.prisma.rosterPlayers.create({
      data: this.toCreateData(player)
    });

    return this.toDomain(saved);
  }

  async update(player: RosterPlayer): Promise<RosterPlayer> {
    const updated = await this.prisma.rosterPlayers.update({
      where: { id: player.id },
      data: this.toUpdateData(player)
    });

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.rosterPlayers.delete({
      where: { id }
    });
  }

  private toDomain(prisma: any): RosterPlayer {
    return {
      id: prisma.id,
      teamId: String(prisma.teamId), // Convert INT to string
      playerId: prisma.playerId,
      playerName: prisma.playerName,
      position: prisma.position,
      positionGroup: prisma.positionGroup as PositionGroup,
      depthChartOrder: prisma.depthChartOrder,
      age: prisma.age,
      yearsExperience: prisma.yearsExperience,
      performanceGrade: Number(prisma.performanceGrade), // Convert Decimal to number
      isStarter: prisma.isStarter,
      contractYearsRemaining: prisma.contractYearsRemaining
    };
  }

  private toCreateData(domain: RosterPlayer) {
    return {
      teamId: parseInt(domain.teamId),
      playerId: domain.playerId,
      playerName: domain.playerName,
      position: domain.position,
      positionGroup: domain.positionGroup,
      depthChartOrder: domain.depthChartOrder,
      age: domain.age,
      yearsExperience: domain.yearsExperience,
      performanceGrade: domain.performanceGrade,
      isStarter: domain.isStarter,
      contractYearsRemaining: domain.contractYearsRemaining,
      injuryStatus: null,
      notes: null
    };
  }

  private toUpdateData(domain: RosterPlayer) {
    return {
      teamId: parseInt(domain.teamId),
      playerId: domain.playerId,
      playerName: domain.playerName,
      position: domain.position,
      positionGroup: domain.positionGroup,
      depthChartOrder: domain.depthChartOrder,
      age: domain.age,
      yearsExperience: domain.yearsExperience,
      performanceGrade: domain.performanceGrade,
      isStarter: domain.isStarter,
      contractYearsRemaining: domain.contractYearsRemaining,
      injuryStatus: null,
      notes: null
    };
  }

  private calculateNeedSeverity(
    starters: RosterPlayer[],
    backups: RosterPlayer[],
    averageAge: number,
    averagePerformance: number
  ): number {
    let severity = 0;

    // Poor starter quality
    if (averagePerformance < 60) {
      severity += 40;
    } else if (averagePerformance < 70) {
      severity += 20;
    }

    // Lack of depth
    if (backups.length === 0) {
      severity += 30;
    } else if (backups.length === 1) {
      severity += 15;
    }

    // Age concerns
    if (averageAge >= 30) {
      severity += 20;
    } else if (averageAge >= 28) {
      severity += 10;
    }

    // No starters
    if (starters.length === 0) {
      severity += 50;
    }

    return Math.min(100, severity);
  }
}