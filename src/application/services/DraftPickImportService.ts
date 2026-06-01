import { PrismaClient } from '@prisma/client';
import { DraftPickDTO } from '../../domain/draftpick/dto/DraftPickDTO';
import { teamAbbreviationMapper } from '../../infrastructure/scraper/TeamAbbreviationMapping';
import { DraftPick_status } from '@prisma/client';
import { resolveDraftPickDefaults } from '../../infrastructure/repositories/helpers/resolveDraftPickDefaults';
/**
 * Draft Pick Import Service
 * Handles the business logic for importing draft picks into the database
 * Follows Single Responsibility Principle - only handles import logic
 */
export class DraftPickImportService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Imports draft picks into the database
   * Creates or updates Player, PlayerTeam, and DraftPick records
   */
  async importDraftPicks(year: number, picks: DraftPickDTO[]): Promise<ImportResult> {
    const result: ImportResult = {
      totalProcessed: 0,
      playersCreated: 0,
      playersUpdated: 0,
      draftPicksCreated: 0,
      draftPicksUpdated: 0,
      playerTeamsCreated: 0,
      errors: [],
    };

    for (const pick of picks) {
      try {
        await this.importSinglePick(year, pick, result);
        result.totalProcessed++;
      } catch (error) {
        result.errors.push({
          pick,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Imports a single draft pick
   */
  private async importSinglePick(
    year: number,
    pick: DraftPickDTO,
    result: ImportResult
  ): Promise<void> {
    const { playerName, position, college, age, teamAbbreviation, round, pickNumber } = pick;

    // Split player name into first and last
    const [firstName, ...lastNameParts] = playerName.split(' ');
    const lastName = lastNameParts.join(' ') || firstName;

    // Convert PFR abbreviation to standard abbreviation
    const standardAbbreviation = teamAbbreviationMapper.toStandard(teamAbbreviation);

    // Find or create team
    const team = await this.findTeamByAbbreviation(standardAbbreviation);
    if (!team) {
      throw new Error(
        `Team not found for abbreviation: ${teamAbbreviation} (mapped to: ${standardAbbreviation})`
      );
    }

    // Find or create player
    const player = await this.findOrCreatePlayer(
      firstName,
      lastName,
      position,
      college,
      age,
      year,
      result
    );

    // Create or update draft pick
    await this.createOrUpdateDraftPick(
      year,
      round,
      pickNumber,
      team.id,
      player.id,
      position,
      college,
      result
    );

    // Create or update player team relationship
    await this.createOrUpdatePlayerTeam(player.id, team.id, year, result);
  }

  /**
   * Finds a team by abbreviation
   */
  private async findTeamByAbbreviation(abbreviation: string) {
    return this.prisma.team.findFirst({
      where: {
        OR: [{ abbreviation: abbreviation }, { name: { contains: abbreviation } }],
      },
    });
  }

  /**
   * Finds or creates a player
   */
  private async findOrCreatePlayer(
    firstName: string,
    lastName: string,
    position: string,
    college: string,
    age: number,
    draftYear: number,
    result: ImportResult
  ) {
    // Try to find existing player
    const existingPlayer = await this.prisma.player.findFirst({
      where: {
        firstName,
        lastName,
        university: college,
      },
    });

    if (existingPlayer) {
      // Update player if needed
      const updated = await this.prisma.player.update({
        where: { id: existingPlayer.id },
        data: {
          position,
          yearEnteredLeague: draftYear,
        },
      });
      result.playersUpdated++;
      return updated;
    }

    // Create new player
    const newPlayer = await this.prisma.player.create({
      data: {
        firstName,
        lastName,
        age,
        position,
        university: college,
        yearEnteredLeague: draftYear,
      },
    });
    result.playersCreated++;
    return newPlayer;
  }

  /**
   * Creates or updates a draft pick record
   */
  private async createOrUpdateDraftPick(
    year: number,
    round: number,
    pickNumber: number,
    teamId: number,
    playerId: number,
    position: string,
    college: string,
    result: ImportResult
  ): Promise<void> {
    const existingPick = await this.prisma.draftPick.findFirst({
      where: {
        draftYear: year,
        round,
        pickNumber,
      },
    });

    if (existingPick) {
      await this.prisma.draftPick.update({
        where: { id: existingPick.id },
        data: {
          playerId,
          currentTeamId: teamId,
          position,
          college,
          used: true,
        },
      });
      result.draftPicksUpdated++;
    } else {
      const defaults = await resolveDraftPickDefaults(this.prisma, year, round, null);

      await this.prisma.draftPick.create({
        data: {
          draftEventId: defaults.draftEventId,
          draftYear: year,
          round,
          pickInRound: defaults.pickInRound,
          pickNumber,
          currentTeamId: teamId,
          originalTeam: teamId,
          playerId,
          position,
          college,
          used: true,
          status: DraftPick_status.PICKED,
        },
      });
      result.draftPicksCreated++;
    }
  }

  /**
   * Creates or updates a player team relationship
   */
  private async createOrUpdatePlayerTeam(
    playerId: number,
    teamId: number,
    year: number,
    result: ImportResult
  ): Promise<void> {
    const existingRelation = await this.prisma.playerTeam.findFirst({
      where: {
        playerId,
        teamId,
      },
    });

    if (!existingRelation) {
      await this.prisma.playerTeam.create({
        data: {
          playerId,
          teamId,
          startYear: year,
          currentTeam: true,
          isActive: 1,
        },
      });
      result.playerTeamsCreated++;
    }
  }
}

/**
 * Import Result Interface
 */
export interface ImportResult {
  totalProcessed: number;
  playersCreated: number;
  playersUpdated: number;
  draftPicksCreated: number;
  draftPicksUpdated: number;
  playerTeamsCreated: number;
  errors: Array<{
    pick: DraftPickDTO;
    error: string;
  }>;
}
