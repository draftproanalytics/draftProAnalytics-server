// src/application/game/services/GameService.ts
import { Game } from '@/domain/game/entities/Game';
import type { IGameRepository } from '@/domain/game/repositories/IGameRepository';
import type {
  CreateGameDto,
  UpdateGameDto,
  GameFiltersDto,
  PaginationDto,
  UpdateScoreDto,
} from '../dto/GameDto';
import type { PaginatedResponse } from '@/shared/types/common';
import { NotFoundError, ValidationError } from '@/shared/errors/AppError';
import type { ITeamRepository } from '@/domain/team/repositories/ITeamRepository';

export class GameService {
  constructor(
    private readonly gameRepository: IGameRepository,
    private readonly teamRepository?: ITeamRepository // ← Add this parameter
  ) {}

  /**
   * Create a new game
   * Repository now returns Game with team relations loaded
   */
  async createGame(dto: CreateGameDto): Promise<Game> {
    // Validate teams exist and are different
    if (dto.homeTeamId === dto.awayTeamId) {
      throw new ValidationError('Home team and away team cannot be the same');
    }

    // Check for game conflicts
    if (dto.gameDate) {
      const conflict = await this.gameRepository.checkGameConflict(
        dto.homeTeamId,
        dto.awayTeamId,
        new Date(dto.gameDate),
        dto.seasonYear
      );
      if (conflict) {
        throw new ValidationError(
          'A game already exists for these teams on this date in this season'
        );
      }
    }

    const game = Game.create({
      seasonYear: dto.seasonYear,
      gameWeek: dto.gameWeek,
      seasonType: dto.seasonType,
      gameDate: dto.gameDate ? new Date(dto.gameDate) : undefined,
      homeTeamId: dto.homeTeamId,
      awayTeamId: dto.awayTeamId,
      gameLocation: dto.gameLocation,
      gameCity: dto.gameCity,
      gameStateProvince: dto.gameStateProvince,
      gameCountry: dto.gameCountry || 'USA',
      homeScore: dto.homeScore,
      awayScore: dto.awayScore,
      gameStatus: dto.gameStatus || 'scheduled',
    });

    return await this.gameRepository.save(game);
  }

  /**
   * Get game by ID
   * Repository now returns Game with team relations loaded
   */
  async getGameById(id: number): Promise<Game> {
    const game = await this.gameRepository.findById(id);
    if (!game) {
      throw new NotFoundError('Game', id);
    }
    return game;
  }

  /**
   * Get all games with filters and pagination
   * Repository now returns Games with team relations loaded
   */
  async getAllGames(
    filters?: GameFiltersDto,
    pagination?: PaginationDto
  ): Promise<PaginatedResponse<Game>> {
    return await this.gameRepository.findAll(filters, pagination);
  }

  /**
   * Get seasonType games
   * Repository now returns Games with team relations loaded
   */
  async getPreseasonGames(teamId?: number, preseasonWeek?: number): Promise<Game[]> {
    return await this.gameRepository.findPreseasonGames(teamId, preseasonWeek);
  }

  /**
   * Get regular season games
   * Repository now returns Games with team relations loaded
   */
  async getRegularSeasonGames(teamId?: number, seasonYear?: string): Promise<Game[]> {
    return await this.gameRepository.findRegularSeasonGames(teamId, seasonYear);
  }

  /**
   * Get games for a specific team and season
   * Repository now returns Games with team relations loaded
   */
  async getTeamSeasonGames(teamId: number, seasonYear: string): Promise<Game[]> {
    return await this.gameRepository.findByTeamAndSeason(teamId, seasonYear);
  }

  /**
   * Get upcoming games
   * Repository now returns Games with team relations loaded
   */
  async getUpcomingGames(teamId?: number, limit?: number): Promise<Game[]> {
    return await this.gameRepository.findUpcomingGames(teamId, limit);
  }

  /**
   * Get completed games
   * Repository now returns Games with team relations loaded
   */
  async getCompletedGames(teamId?: number, limit?: number): Promise<Game[]> {
    return await this.gameRepository.findCompletedGames(teamId, limit);
  }

  /**
   * Update a game
   * Repository now returns Game with team relations loaded
   */
  async updateGame(id: number, dto: UpdateGameDto): Promise<Game> {
    const existingGame = await this.gameRepository.findById(id);
    if (!existingGame) {
      throw new NotFoundError('Game', id);
    }

    // Validate date conflict if date is being updated
    if (dto.gameDate) {
      const conflict = await this.gameRepository.checkGameConflict(
        existingGame.homeTeamId,
        existingGame.awayTeamId,
        new Date(dto.gameDate),
        existingGame.seasonYear
      );
      if (conflict) {
        const conflictGame = await this.gameRepository.findById(id);
        if (!conflictGame || conflictGame.id !== id) {
          throw new ValidationError(
            'A game already exists for these teams on this date in this season'
          );
        }
      }
    }

    const updatedGame = Game.create({
      id: existingGame.id,
      seasonYear: existingGame.seasonYear,
      gameWeek: dto.gameWeek ?? existingGame.gameWeek,
      seasonType: dto.seasonType ?? existingGame.seasonType,
      gameDate: dto.gameDate ? new Date(dto.gameDate) : existingGame.gameDate,
      homeTeamId: existingGame.homeTeamId,
      awayTeamId: existingGame.awayTeamId,
      gameLocation: dto.gameLocation ?? existingGame.gameLocation,
      gameCity: dto.gameCity ?? existingGame.gameCity,
      gameStateProvince: dto.gameStateProvince ?? existingGame.gameStateProvince,
      gameCountry: dto.gameCountry ?? existingGame.gameCountry,
      homeScore: dto.homeScore ?? existingGame.homeScore,
      awayScore: dto.awayScore ?? existingGame.awayScore,
      gameStatus: (dto.gameStatus ?? existingGame.gameStatus) as
        | 'scheduled'
        | 'in_progress'
        | 'completed'
        | 'cancelled'
        | 'postponed'
        | undefined,
    });

    return await this.gameRepository.update(id, updatedGame);
  }

  /**
   * Update game score only
   * Repository now returns Game with team relations loaded
   */
  async updateGameScore(id: number, dto: UpdateScoreDto): Promise<Game> {
    const existingGame = await this.gameRepository.findById(id);
    if (!existingGame) {
      throw new NotFoundError('Game', id);
    }

    existingGame.updateScore(dto.homeScore, dto.awayScore, dto.gameStatus);

    return await this.gameRepository.update(id, existingGame);
  }

  /**
   * Delete a game
   */
  async deleteGame(id: number): Promise<void> {
    const exists = await this.gameRepository.exists(id);
    if (!exists) {
      throw new NotFoundError('Game', id);
    }
    await this.gameRepository.delete(id);
  }

  /**
   * Get games for a team in a specific week
   * Repository now returns Games with team relations loaded
   */
  async getTeamWeekGames(teamId: number, seasonYear: string, gameWeek: number): Promise<Game[]> {
    return await this.gameRepository.findByTeamSeasonWeek(teamId, seasonYear, gameWeek);
  }

  /**
   * Get all games for a season (seasonType + regular + playoffs)
   * Repository now returns Games with team relations loaded
   */
  async getAllSeasonGames(teamId?: number, seasonYear?: string): Promise<Game[]> {
    return await this.gameRepository.findAllGamesForSeason(teamId, seasonYear);
  }

  /****************************************************************
   * Calculate conference record for a team in a season
   *  (new methods added for Team Info Statistics)
   ****************************************************************/

  async getConferenceRecord(
    teamId: number,
    seasonYear: string
  ): Promise<{ wins: number; losses: number; ties: number }> {
    const games = await this.gameRepository.findByTeamAndSeason(teamId, seasonYear);
    const completedGames = games.filter((g) => (g.seasonType === 2 || g.seasonType === 3) && (g.gameStatus === 'completed' || g.gameStatus === 'final'));

    let wins = 0;
    let losses = 0;
    let ties = 0;

    for (const game of completedGames) {
      const isHome = game.homeTeamId === teamId;
      const currentTeam = isHome ? game.homeTeam : game.awayTeam;
      const opponent = isHome ? game.awayTeam : game.homeTeam;

      // Only count if opponent is in same conference
      if (opponent && currentTeam && opponent.conference === currentTeam.conference) {
        const teamScore = isHome ? game.homeScore : game.awayScore;
        const oppScore = isHome ? game.awayScore : game.homeScore;

        if (teamScore !== undefined && oppScore !== undefined) {
          if (teamScore > oppScore) wins++;
          else if (teamScore < oppScore) losses++;
          else ties++;
        }
      }
    }

    return { wins, losses, ties };
  }

  /**
   * Calculate division record for a team in a season
   */
  async getDivisionRecord(
    teamId: number,
    seasonYear: string
  ): Promise<{ wins: number; losses: number; ties: number }> {
    const games = await this.gameRepository.findByTeamAndSeason(teamId, seasonYear);
    const completedGames = games.filter((g) => (g.seasonType === 2 || g.seasonType === 3) && (g.gameStatus === 'completed' || g.gameStatus === 'final'));

    let wins = 0;
    let losses = 0;
    let ties = 0;

    for (const game of completedGames) {
      const isHome = game.homeTeamId === teamId;
      const currentTeam = isHome ? game.homeTeam : game.awayTeam;
      const opponent = isHome ? game.awayTeam : game.homeTeam;

      // Only count if opponent is in same division
      if (
        opponent &&
        currentTeam &&
        opponent.division === currentTeam.division &&
        opponent.conference === currentTeam.conference
      ) {
        const teamScore = isHome ? game.homeScore : game.awayScore;
        const oppScore = isHome ? game.awayScore : game.homeScore;

        if (teamScore !== undefined && oppScore !== undefined) {
          if (teamScore > oppScore) wins++;
          else if (teamScore < oppScore) losses++;
          else ties++;
        }
      }
    }

    return { wins, losses, ties };
  }

  /**
   * Get division standings for a team's division
   */
  async getDivisionStandings(
    teamId: number,
    seasonYear: string
  ): Promise<
    {
      teamId: number;
      teamName: string;
      wins: number;
      losses: number;
      ties: number;
      winPercentage: number;
      divisionWins: number;
      divisionLosses: number;
    }[]
  > {
    if (!this.teamRepository) {
      throw new Error('TeamRepository is required for division standings calculation');
    }

    // First, get a game for this team to find their division/conference
    const teamGames = await this.gameRepository.findByTeamAndSeason(teamId, seasonYear);
    if (teamGames.length === 0) {
      return []; // No games, can't determine division
    }

    // Extract team info from the first game
    const firstGame = teamGames[0];
    const currentTeam = firstGame.homeTeamId === teamId ? firstGame.homeTeam : firstGame.awayTeam;

    if (!currentTeam || !currentTeam.division || !currentTeam.conference) {
      throw new NotFoundError('Team division/conference information', teamId);
    }

    // Get all teams in the same division via the team repository
    const divisionTeams = await this.teamRepository.findByDivision(currentTeam.division);

    interface TeamStanding {
      teamId: number;
      teamName: string;
      wins: number;
      losses: number;
      ties: number;
      winPercentage: number;
      divisionWins: number;
      divisionLosses: number;
    }

    const standings = await Promise.all(
      divisionTeams.map(async (divTeam): Promise<TeamStanding> => {
        const games = await this.gameRepository.findByTeamAndSeason(divTeam.id!, seasonYear);
        const completedGames = games.filter((g) => g.seasonType === 2 && (g.gameStatus === 'completed' || g.gameStatus === 'final'));

        let wins = 0;
        let losses = 0;
        let ties = 0;
        let divWins = 0;
        let divLosses = 0;

        for (const game of completedGames) {
          const isHome = game.homeTeamId === divTeam.id;
          const opponent = isHome ? game.awayTeam : game.homeTeam;
          const teamScore = isHome ? game.homeScore : game.awayScore;
          const oppScore = isHome ? game.awayScore : game.homeScore;

          if (teamScore !== undefined && oppScore !== undefined) {
            if (teamScore > oppScore) {
              wins++;
              if (
                opponent?.division === currentTeam.division &&
                opponent?.conference === currentTeam.conference
              ) {
                divWins++;
              }
            } else if (teamScore < oppScore) {
              losses++;
              if (
                opponent?.division === currentTeam.division &&
                opponent?.conference === currentTeam.conference
              ) {
                divLosses++;
              }
            } else {
              ties++;
            }
          }
        }

        const totalGames = wins + losses + ties;
        const winPercentage = totalGames > 0 ? (wins + ties * 0.5) / totalGames : 0;

        return {
          teamId: divTeam.id!,
          teamName: divTeam.name,
          wins,
          losses,
          ties,
          winPercentage,
          divisionWins: divWins,
          divisionLosses: divLosses,
        };
      })
    );

    // Sort by win percentage, then division record
    return standings.sort((a: TeamStanding, b: TeamStanding) => {
      if (b.winPercentage !== a.winPercentage) {
        return b.winPercentage - a.winPercentage;
      }
      const aDivPct = a.divisionWins / (a.divisionWins + a.divisionLosses || 1);
      const bDivPct = b.divisionWins / (b.divisionWins + b.divisionLosses || 1);
      return bDivPct - aDivPct;
    });
  }

  //************************** New Stats added later ********************* */
  /**
   * Calculate home/away record for a team in a season
   */
  async getHomeAwayRecords(
    teamId: number,
    seasonYear: string
  ): Promise<{
    home: { wins: number; losses: number; ties: number };
    away: { wins: number; losses: number; ties: number };
  }> {
    const games = await this.gameRepository.findByTeamAndSeason(teamId, seasonYear);
    const completedGames = games.filter((g) => (g.seasonType === 2 || g.seasonType === 3) && (g.gameStatus === 'completed' || g.gameStatus === 'final'));

    let homeWins = 0,
      homeLosses = 0,
      homeTies = 0;
    let awayWins = 0,
      awayLosses = 0,
      awayTies = 0;

    for (const game of completedGames) {
      const isHome = game.homeTeamId === teamId;
      const teamScore = isHome ? game.homeScore : game.awayScore;
      const oppScore = isHome ? game.awayScore : game.homeScore;

      if (teamScore !== undefined && oppScore !== undefined) {
        if (isHome) {
          if (teamScore > oppScore) homeWins++;
          else if (teamScore < oppScore) homeLosses++;
          else homeTies++;
        } else {
          if (teamScore > oppScore) awayWins++;
          else if (teamScore < oppScore) awayLosses++;
          else awayTies++;
        }
      }
    }

    return {
      home: { wins: homeWins, losses: homeLosses, ties: homeTies },
      away: { wins: awayWins, losses: awayLosses, ties: awayTies },
    };
  }
  async getTeamSeasonYears(teamId: number): Promise<readonly number[]> {
    return this.gameRepository.findSeasonYearsByTeam(teamId);
  }

  /**
   * Get team statistics summary
   */
  async getTeamStatistics(
    teamId: number,
    seasonYear: string
  ): Promise<{
    overallRecord: { wins: number; losses: number; ties: number };
    conferenceRecord: { wins: number; losses: number; ties: number };
    divisionRecord: { wins: number; losses: number; ties: number };
    homeRecord: { wins: number; losses: number; ties: number };
    awayRecord: { wins: number; losses: number; ties: number };
    divisionPosition: number;
    divisionTotal: number;
  }> {
    const [conf, div, standings, homeAway] = await Promise.all([
      this.getConferenceRecord(teamId, seasonYear),
      this.getDivisionRecord(teamId, seasonYear),
      this.getDivisionStandings(teamId, seasonYear),
      this.getHomeAwayRecords(teamId, seasonYear),
    ]);

    const position = standings.findIndex((s) => s.teamId === teamId) + 1;

    // Calculate overall record (existing code)
    const games = await this.gameRepository.findByTeamAndSeason(teamId, seasonYear);
    const completedGames = games.filter((g) => (g.seasonType === 2 || g.seasonType === 3) && (g.gameStatus === 'completed' || g.gameStatus === 'final'));

    let overallWins = 0,
      overallLosses = 0,
      overallTies = 0;

    for (const game of completedGames) {
      const isHome = game.homeTeamId === teamId;
      const teamScore = isHome ? game.homeScore : game.awayScore;
      const oppScore = isHome ? game.awayScore : game.homeScore;

      if (teamScore !== undefined && oppScore !== undefined) {
        if (teamScore > oppScore) overallWins++;
        else if (teamScore < oppScore) overallLosses++;
        else overallTies++;
      }
    }

    return {
      overallRecord: { wins: overallWins, losses: overallLosses, ties: overallTies },
      conferenceRecord: conf,
      divisionRecord: div,
      homeRecord: homeAway.home,
      awayRecord: homeAway.away,
      divisionPosition: position,
      divisionTotal: standings.length,
    };
  }
}
