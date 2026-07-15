import type { PrismaClient, espn_players_position } from '@prisma/client';
import { DraftPick_status } from '@prisma/client';
import type { EspnDraftAthleteDto, EspnDraftSelectionDto } from '../../domain/dtos/EspnDraftImport.dto';
import type { IEspnDraftImportRepository, ImportDraftSelectionResult, UpsertDraftAthleteResult } from '../../domain/repositories/IEspnDraftImportRepository';

const allowedPositions = new Set(['QB','RB','FB','WR','TE','OL','C','G','T','DL','DE','DT','NT','LB','MLB','OLB','DB','CB','S','FS','SS','K','P','LS']);
const mapPosition = (position: string): espn_players_position => {
  const normalized = position.toUpperCase();
  return (allowedPositions.has(normalized) ? normalized : 'WR') as espn_players_position;
};
const splitName = (displayName: string): { firstName: string; lastName: string } => {
  const parts = displayName.trim().split(/\s+/);
  return { firstName: parts.shift() ?? 'Unknown', lastName: parts.join(' ') || 'Unknown' };
};

export class PrismaEspnDraftImportRepository implements IEspnDraftImportRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async upsertDraftAthlete(athlete: EspnDraftAthleteDto, draftYear: number): Promise<UpsertDraftAthleteResult> {
    const existingEspn = await this.prisma.espn_players.findUnique({ where: { espn_id: athlete.espnAthleteId } });
    await this.prisma.espn_players.upsert({
      where: { espn_id: athlete.espnAthleteId },
      update: this.espnPlayerData(athlete),
      create: { espn_id: athlete.espnAthleteId, ...this.espnPlayerData(athlete) },
    });
    const existingPlayer = await this.prisma.player.findUnique({ where: { espnAthleteId: athlete.espnAthleteId } });
    const fallback = splitName(athlete.displayName);
    const player = await this.prisma.player.upsert({
      where: { espnAthleteId: athlete.espnAthleteId },
      update: {
        firstName: athlete.firstName || fallback.firstName,
        lastName: athlete.lastName || fallback.lastName,
        age: athlete.age ?? existingPlayer?.age ?? 0,
        height: athlete.height ?? existingPlayer?.height,
        weight: athlete.weight ?? existingPlayer?.weight,
        university: athlete.college ?? existingPlayer?.university,
        status: athlete.status ?? existingPlayer?.status,
        position: athlete.position || existingPlayer?.position,
        yearEnteredLeague: existingPlayer?.yearEnteredLeague ?? draftYear,
      },
      create: {
        espnAthleteId: athlete.espnAthleteId,
        firstName: athlete.firstName || fallback.firstName,
        lastName: athlete.lastName || fallback.lastName,
        age: athlete.age ?? 0,
        height: athlete.height,
        weight: athlete.weight,
        university: athlete.college,
        status: athlete.status,
        position: athlete.position,
        yearEnteredLeague: draftYear,
      },
    });
    return { espnPlayerCreated: !existingEspn, playerCreated: !existingPlayer, playerId: player.id };
  }

  public async importDraftSelection(selection: EspnDraftSelectionDto, activateMembership: boolean): Promise<ImportDraftSelectionResult> {
    const existingRaw = await this.prisma.espn_draft_picks.findUnique({ where: { espn_id: selection.espnDraftPickId } });
    await this.prisma.espn_draft_picks.upsert({
      where: { espn_id: selection.espnDraftPickId },
      update: this.rawPickData(selection),
      create: { espn_id: selection.espnDraftPickId, ...this.rawPickData(selection) },
    });

    if (!selection.athleteEspnId) {
      return {
        rawDraftPickCreated: !existingRaw,
        unmatchedPlayer: true,
        dpaDraftPickUpdated: false,
        membershipCreated: false,
        membershipUpdated: false,
        unmatchedTeam: false,
        activeMembershipConflict: false,
      };
    }

    // Draft-results import treats Player as read-only. Player profile creation and
    // refresh belongs exclusively to LOAD_ESPN_DRAFT_CLASS_PLAYERS.
    const player = await this.prisma.player.findUnique({
      where: { espnAthleteId: selection.athleteEspnId },
    });
    if (!player) {
      return {
        rawDraftPickCreated: !existingRaw,
        unmatchedPlayer: true,
        dpaDraftPickUpdated: false,
        membershipCreated: false,
        membershipUpdated: false,
        unmatchedTeam: false,
        activeMembershipConflict: false,
      };
    }

    const teamIdNumber = Number.parseInt(selection.teamEspnId, 10);
    const team = Number.isInteger(teamIdNumber)
      ? await this.prisma.team.findUnique({ where: { espnTeamId: teamIdNumber } })
      : null;
    if (!team) {
      return {
        rawDraftPickCreated: !existingRaw,
        unmatchedPlayer: false,
        dpaDraftPickUpdated: false,
        membershipCreated: false,
        membershipUpdated: false,
        unmatchedTeam: true,
        activeMembershipConflict: false,
      };
    }

    const dpaPick = await this.prisma.draftPick.findFirst({
      where: { draftYear: selection.draftYear, pickNumber: selection.overallPick },
    });
    if (dpaPick) {
      await this.prisma.draftPick.update({
        where: { id: dpaPick.id },
        data: {
          playerId: player.id,
          currentTeamId: team.id,
          playerFirstName: player.firstName,
          playerLastName: player.lastName,
          position: player.position ?? selection.position,
          college: player.university ?? selection.college,
          isCompensatory: selection.isCompensatory,
          used: true,
          status: DraftPick_status.PICKED,
          selectedAt: new Date(),
        },
      });
    }

    const existingMembership = await this.prisma.playerTeam.findFirst({
      where: { playerId: player.id, teamId: team.id, startYear: selection.draftYear },
    });
    const conflictingActive = activateMembership
      ? await this.prisma.playerTeam.findFirst({
          where: { playerId: player.id, isActive: 1, NOT: { teamId: team.id } },
        })
      : null;

    if (existingMembership) {
      await this.prisma.playerTeam.update({
        where: { id: existingMembership.id },
        data: {
          currentTeam: activateMembership && !conflictingActive,
          isActive: activateMembership && !conflictingActive ? 1 : existingMembership.isActive,
          jerseyNumber: selection.athlete?.jerseyNumber ?? existingMembership.jerseyNumber,
          position: selection.position ?? existingMembership.position
        },
      });
    } else {
      await this.prisma.playerTeam.create({
        data: {
          playerId: player.id,
          teamId: team.id,
          startYear: selection.draftYear,
          currentTeam: activateMembership && !conflictingActive,
          position: player.position ?? selection.position,
          isActive: activateMembership && !conflictingActive ? 1 : 0,
          jerseyNumber: selection.athlete?.jerseyNumber ?? null,
        },
      });
    }

    return {
      rawDraftPickCreated: !existingRaw,
      unmatchedPlayer: false,
      dpaDraftPickUpdated: !!dpaPick,
      membershipCreated: !existingMembership,
      membershipUpdated: !!existingMembership,
      unmatchedTeam: false,
      activeMembershipConflict: !!conflictingActive,
    };
  }

  private espnPlayerData(a: EspnDraftAthleteDto) {
    return { first_name: a.firstName, last_name: a.lastName, display_name: a.displayName, short_name: a.shortName,
      position: mapPosition(a.position), jersey_number: a.jerseyNumber, team_espn_id: a.teamEspnId,
      height: a.height === null ? null : Math.round(a.height), weight: a.weight === null ? null : Math.round(a.weight),
      age: a.age, date_of_birth: a.dateOfBirth, college: a.college, experience: a.experience,
      is_active: true, is_rookie: true, last_sync_at: new Date() };
  }
  private rawPickData(s: EspnDraftSelectionDto) {
    return { year: s.draftYear, round: s.round, overall_pick: s.overallPick, team_espn_id: s.teamEspnId,
      player_espn_id: s.athleteEspnId, player_name: s.playerName, position: s.position.slice(0,10), college: s.college,
      is_compensatory: s.isCompensatory, is_forfeited: s.isForfeited, original_team_espn_id: s.originalTeamEspnId,
      is_active: true, last_sync_at: new Date() };
  }
}
