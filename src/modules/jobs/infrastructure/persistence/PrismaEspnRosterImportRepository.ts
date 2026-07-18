import type { PrismaClient } from '@prisma/client';
import type {
  EspnRosterAthleteDto,
  EspnRosterImportMode,
  EspnRosterImportTeamDto,
  UpsertTeamRosterAthleteResult,
} from '../../domain/dtos/EspnRosterImport.dto';
import type { IEspnRosterImportRepository } from '../../domain/repositories/IEspnRosterImportRepository';

export class PrismaEspnRosterImportRepository implements IEspnRosterImportRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async listImportTeams(teamId?: number): Promise<readonly EspnRosterImportTeamDto[]> {
    const teams = await this.prisma.team.findMany({
      where: {
        ...(teamId === undefined ? {} : { id: teamId }),
        espnTeamId: { not: null },
      },
      select: { id: true, espnTeamId: true, name: true },
      orderBy: { name: 'asc' },
    });

    return teams.flatMap((team) => team.espnTeamId === null ? [] : [{
      teamId: team.id,
      espnTeamId: team.espnTeamId,
      teamName: team.name,
    }]);
  }

  public async upsertCurrentRosterAthlete(
    team: EspnRosterImportTeamDto,
    athlete: EspnRosterAthleteDto,
    seasonYear: number,
    importMode: EspnRosterImportMode,
  ): Promise<UpsertTeamRosterAthleteResult> {
    return this.prisma.$transaction(async (tx) => {
      const existingPlayer = await tx.player.findUnique({
        where: { espnAthleteId: athlete.espnAthleteId },
        select: { id: true, age: true, yearEnteredLeague: true },
      });
      const inferredEntryYear = athlete.experienceYears === null
        ? existingPlayer?.yearEnteredLeague ?? null
        : Math.max(1900, seasonYear - athlete.experienceYears);

      const player = await tx.player.upsert({
        where: { espnAthleteId: athlete.espnAthleteId },
        create: {
          espnAthleteId: athlete.espnAthleteId,
          firstName: athlete.firstName,
          lastName: athlete.lastName,
          age: athlete.age ?? 0,
          height: athlete.height,
          weight: athlete.weight,
          university: athlete.college,
          status: athlete.status,
          yearEnteredLeague: inferredEntryYear,
        },
        update: {
          firstName: athlete.firstName,
          lastName: athlete.lastName,
          ...(athlete.age === null ? {} : { age: athlete.age }),
          ...(athlete.height === null ? {} : { height: athlete.height }),
          ...(athlete.weight === null ? {} : { weight: athlete.weight }),
          ...(athlete.college === null ? {} : { university: athlete.college }),
          ...(athlete.status === null ? {} : { status: athlete.status }),
          ...(inferredEntryYear === null ? {} : { yearEnteredLeague: inferredEntryYear }),
        },
      });

      const deactivated = importMode === 'CURRENT'
        ? await tx.playerTeam.updateMany({
            where: {
              playerId: player.id,
              NOT: { teamId: team.teamId },
              OR: [{ currentTeam: true }, { isActive: 1 }],
            },
            data: { currentTeam: false, isActive: 0, endYear: seasonYear },
          })
        : { count: 0 };

      const membership = await tx.playerTeam.findFirst({
        where: importMode === 'CURRENT'
          ? {
              playerId: player.id,
              teamId: team.teamId,
              OR: [{ currentTeam: true }, { isActive: 1 }, { endYear: null }],
            }
          : {
              playerId: player.id,
              teamId: team.teamId,
              startYear: seasonYear,
            },
        orderBy: [{ startYear: 'desc' }, { id: 'desc' }],
      });

      if (membership) {
        await tx.playerTeam.update({
          where: { id: membership.id },
          data: {
            currentTeam: importMode === 'CURRENT',
            isActive: importMode === 'CURRENT' ? 1 : 0,
            endYear: importMode === 'CURRENT' ? null : seasonYear,
            startYear: membership.startYear ?? seasonYear,
            position: athlete.position ?? membership.position,
            jerseyNumber: athlete.jerseyNumber ?? membership.jerseyNumber,
          },
        });
      } else {
        await tx.playerTeam.create({
          data: {
            playerId: player.id,
            teamId: team.teamId,
            currentTeam: importMode === 'CURRENT',
            isActive: importMode === 'CURRENT' ? 1 : 0,
            startYear: seasonYear,
            endYear: importMode === 'CURRENT' ? null : seasonYear,
            position: athlete.position,
            jerseyNumber: athlete.jerseyNumber,
          },
        });
      }

      return {
        playerCreated: existingPlayer === null,
        membershipCreated: membership === null,
        membershipUpdated: membership !== null,
        priorMembershipsDeactivated: deactivated.count,
        playerId: player.id,
      };
    });
  }

  public async deactivateMissingCurrentMemberships(
    teamId: number,
    importedPlayerIds: readonly number[],
    seasonYear: number,
  ): Promise<number> {
    const result = await this.prisma.playerTeam.updateMany({
      where: {
        teamId,
        ...(importedPlayerIds.length === 0 ? {} : { playerId: { notIn: [...importedPlayerIds] } }),
        OR: [{ currentTeam: true }, { isActive: 1 }],
      },
      data: { currentTeam: false, isActive: 0, endYear: seasonYear },
    });
    return result.count;
  }
}
