// src/infrastructure/repositories/DraftPickRepository.ts

import { DraftPickWithRelationsDto } from '@/application/draftPick/dto/DraftPickDto';
import { DraftPick } from '@/domain/draft/entity/DraftPick';
import { DraftPick_status, PrismaClient } from '@prisma/client';
import { resolveDraftPickDefaults } from './helpers/resolveDraftPickDefaults';

export class DraftPickRepository {
  constructor(private prisma: PrismaClient) {}

  async findByDraftYear(year: number): Promise<any[]> {
    // Get picks with team and prospect data using manual joins
    const picks = await this.prisma.$queryRaw`
      SELECT 
        dp.*,
        t.name as teamName,
        t.city as teamCity,
        t.conference as teamConference,
        t.division as teamDivision,
        p.firstName as prospectFirstName,
        p.lastName as prospectLastName,
        p.position as prospectPosition,
        p.college as prospectCollege
      FROM DraftPick dp
      LEFT JOIN Team t ON dp.currentTeamId = t.id
      LEFT JOIN Prospect p ON dp.prospectId = p.id
      WHERE dp.draftYear = ${year}
      ORDER BY dp.pickNumber ASC
    `;

    return picks as any[];
  }

  async fetchByTeamAndYear(
    currentTeamId: number,
    draftYear: number
  ): Promise<DraftPickWithRelationsDto[]> {
    // Get picks with team and prospect data using manual joins
    const picks = await this.prisma.$queryRaw`
      SELECT 
        dp.*,
        t.name as teamName,
        t.city as teamCity,
        t.conference as teamConference,
        t.division as teamDivision,
        p.firstName as prospectFirstName,
        p.lastName as prospectLastName,
        p.position as prospectPosition,
        p.college as prospectCollege
      FROM DraftPick dp
      LEFT JOIN Team t ON dp.currentTeamId = t.id
      LEFT JOIN Prospect p ON dp.prospectId = p.id
      WHERE dp.draftYear = ${draftYear}
      AND   dp.currentTeamId = ${currentTeamId}
      ORDER BY dp.pickNumber ASC
    `;

    return picks as any[];
  }

  async findById(id: number): Promise<DraftPick> {
    const pick = await this.prisma.draftPick.findUnique({
      where: { id },
    });

    if (!pick) {
      throw new Error(`Draft pick with id ${id} not found`);
    }

    return DraftPick.fromDatabase(pick);
  }

  async updatePick(id: number, data: { prospectId?: number; used?: boolean }): Promise<void> {
    await this.prisma.draftPick.update({
      where: { id },
      data: {
        ...(data.prospectId !== undefined && { prospectId: data.prospectId }),
        ...(data.used !== undefined && { used: data.used }),
        updatedAt: new Date(),
      },
    });
  }

  async getTeamForPick(pickId: number) {
    const result = (await this.prisma.$queryRaw`
      SELECT t.*
      FROM DraftPick dp
      JOIN Team t ON dp.currentTeamId = t.id
      WHERE dp.id = ${pickId}
    `) as any[];

    return result[0] || null;
  }

  async create(draftPick: Omit<DraftPick, 'id'>): Promise<DraftPick> {
    const defaults = await resolveDraftPickDefaults(
      this.prisma,
      draftPick.draftYear,
      draftPick.round,
      draftPick.pickInRound
    );

    const created = await this.prisma.draftPick.create({
      data: {
        draftEventId: draftPick.draftEventId ?? defaults.draftEventId,
        round: draftPick.round,
        pickInRound:
          draftPick.pickInRound && draftPick.pickInRound > 0
            ? draftPick.pickInRound
            : defaults.pickInRound,
        pickNumber: draftPick.pickNumber,
        draftYear: draftPick.draftYear,
        currentTeamId: draftPick.currentTeamId,
        originalTeam: draftPick.originalTeam ?? draftPick.currentTeamId,
        prospectId: draftPick.prospectId ?? null,
        playerId: draftPick.playerId ?? null,
        used: draftPick.used ?? false,
        status: draftPick.used ? DraftPick_status.PICKED : DraftPick_status.SCHEDULED,
      },
    });

    return DraftPick.fromDatabase(created);
  }
}
