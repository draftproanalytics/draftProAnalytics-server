import { PrismaClient } from '@prisma/client';
import type { 
  CreateDraftPickDto, 
  UpdateDraftPickDto, 
  DraftPickResponseDto,
  DraftPickWithRelationsDto,
  DraftPickQueryFilters 
} from '../../application/draftPick/dto/DraftPickDto';
import type { IDraftPickRepository } from './IDraftPickRepository';
import { resolveDraftPickCreateDefaults } from './helpers/draftPickCreateDefaults';

export class PrismaDraftPickRepository implements IDraftPickRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(dto: CreateDraftPickDto): Promise<DraftPickResponseDto> {
    return await this.prisma.draftPick.create({
      data: {
        round: dto.round,
        pickNumber: dto.pickNumber,
        pickInRound: dto.pickInRound,
        draftEventId: dto.draftEventId,
        draftYear: dto.draftYear,
        currentTeamId: dto.currentTeamId,
        prospectId: dto.prospectId,
        playerId: dto.playerId,
        used: dto.used ?? false,
        originalTeam: dto.originalTeam,
        position: dto.position,
        college: dto.college,
      },
    });
  }

  async findById(id: number): Promise<DraftPickResponseDto | null> {
    return await this.prisma.draftPick.findUnique({
      where: { id },
    });
  }

  async findAll(filters?: DraftPickQueryFilters): Promise<DraftPickResponseDto[]> {
    const where: any = {};

    if (filters) {
      if (filters.draftYear !== undefined) {
        where.draftYear = filters.draftYear;
      }
      if (filters.currentTeamId !== undefined) {
        where.currentTeamId = filters.currentTeamId;
      }
      if (filters.used !== undefined) {
        where.used = filters.used;
      }
      if (filters.round !== undefined) {
        where.round = filters.round;
      }
    }

    return await this.prisma.draftPick.findMany({
      where,
      orderBy: [
        { draftYear: 'desc' },
        { round: 'asc' },
        { pickNumber: 'asc' },
      ],
    });
  }

  async update(id: number, dto: UpdateDraftPickDto): Promise<DraftPickResponseDto> {
    return await this.prisma.draftPick.update({
      where: { id },
      data: {
        ...(dto.round !== undefined && { round: dto.round }),
        ...(dto.pickNumber !== undefined && { pickNumber: dto.pickNumber }),
        ...(dto.draftYear !== undefined && { draftYear: dto.draftYear }),
        ...(dto.currentTeamId !== undefined && { currentTeamId: dto.currentTeamId }),
        ...(dto.prospectId !== undefined && { prospectId: dto.prospectId }),
        ...(dto.playerId !== undefined && { playerId: dto.playerId }),
        ...(dto.used !== undefined && { used: dto.used }),
        ...(dto.originalTeam !== undefined && { originalTeam: dto.originalTeam }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.college !== undefined && { college: dto.college }),
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.draftPick.delete({
      where: { id },
    });
  }

  async fetchAllWithRelations(): Promise<DraftPickWithRelationsDto[]> {
    const results = await this.prisma.$queryRaw<any[]>`
      SELECT 
        draftYear,
        round,
        pickNumber,
        (SELECT CONCAT(firstName, ' ', lastName) FROM Player WHERE id = playerId) as player,
        (SELECT name FROM Team WHERE id = currentTeamId) as team,
        position
      FROM DraftPick
      ORDER BY draftYear DESC, round ASC, pickNumber ASC
    `;

    return results.map(row => ({
      draftYear: row.draftYear,
      round: row.round,
      pickNumber: row.pickNumber,
      player: row.player,
      team: row.team,
      position: row.position,
    }));
  }

  async fetchByYear(draftYear: number): Promise<DraftPickWithRelationsDto[]> {
    const results = await this.prisma.$queryRaw<any[]>`
      SELECT 
        draftYear,
        round,
        pickNumber,
        (SELECT CONCAT(firstName, ' ', lastName) FROM Player WHERE id = playerId) as player,
        (SELECT name FROM Team WHERE id = currentTeamId) as team,
        position
      FROM DraftPick
      WHERE draftYear = ${draftYear}
      ORDER BY round ASC, pickNumber ASC
    `;

    return results.map(row => ({
      draftYear: row.draftYear,
      round: row.round,
      pickNumber: row.pickNumber,
      player: row.player,
      team: row.team,
      position: row.position,
    }));
  }

  async fetchByTeamAndYear(
    currentTeamId: number, 
    draftYear: number
  ): Promise<DraftPickWithRelationsDto[]> {
    const results = await this.prisma.$queryRaw<any[]>`
      SELECT 
        draftYear,
        round,
        pickNumber,
        (SELECT CONCAT(firstName, ' ', lastName) FROM Player WHERE id = playerId) as player,
        (SELECT name FROM Team WHERE id = currentTeamId) as team,
        position
      FROM DraftPick
      WHERE currentTeamId = ${currentTeamId}
        AND draftYear = ${draftYear}
      ORDER BY round ASC, pickNumber ASC
    `;

    return results.map(row => ({
      draftYear: row.draftYear,
      round: row.round,
      pickNumber: row.pickNumber,
      player: row.player,
      team: row.team,
      position: row.position,
    }));
  }
}