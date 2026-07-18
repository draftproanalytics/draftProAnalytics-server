// src/domain/game/repositories/IGameRepository.ts
import { Prisma } from '@prisma/client';
import type { Game, GameProps } from '../entities/Game';
import type { PaginationParams, PaginatedResponse } from '@/shared/types/common';
import { PlayoffConference, PlayoffRound } from '@/domain/playoffs/valueObjects/PlayoffTypes';

export interface GameFilters {
  seasonYear?: string;
  gameWeek?: number;
  seasonType?: number;
  homeTeamId?: number;
  awayTeamId?: number;
  teamId?: number; // Either home or away
  gameStatus?: string;
  gameCity?: string;
  gameCountry?: string;
  dateFrom?: Date;
  dateTo?: Date;
}
/** Minimal shape the playoff service needs from games */

// Update in IGameRepository.ts

export interface PlayoffGameSummary {
  id: number;
  seasonYear: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number | null;
  awayScore: number | null;
  gameDate: Date | null;
  playoffRound: 'WILDCARD' | 'DIVISIONAL' | 'CONFERENCE' | 'SUPERBOWL';
  playoffConference: 'AFC' | 'NFC' | null;
  homeSeed: number | null;
  awaySeed: number | null;
  // ✅ NEW: Team details
  homeTeamName?: string;
  awayTeamName?: string;
  homeTeamConference?: string | null;
  awayTeamConference?: string | null;
}
/**
 * Repository interface for Game entity
 * All methods that return Game(s) MUST include team relations (homeTeam, awayTeam)
 */
export interface IGameRepository {
  // Core CRUD - All return Games WITH team relations
  save(game: Game): Promise<Game>;
  findById(id: number): Promise<Game | null>;
  findAll(filters?: GameFilters, pagination?: PaginationParams): Promise<PaginatedResponse<Game>>;
  update(id: number, game: Game): Promise<Game>;
  updatePartial(id: number, patch: Prisma.GameUpdateInput): Promise<Game>;
  delete(id: number): Promise<void>;
  exists(id: number): Promise<boolean>;

    /**
   * Fetch a single game by its ESPN competition ID.
   * Used for ESPN sync comparisons (detecting score changes, etc.).
   */
  findByEspnCompetitionId(espnCompetitionId: string): Promise<Game | null>;


  // Team and season queries - All return Games WITH team relations
  findByTeamAndSeason(teamId: number, seasonYear: string): Promise<Game[]>;
  findSeasonYearsByTeam(teamId: number): Promise<readonly number[]>;
  findByTeamSeasonWeek(teamId: number, seasonYear: string, gameWeek: number): Promise<Game[]>;
  
  // Status-based queries - All return Games WITH team relations
  findUpcomingGames(teamId?: number, limit?: number): Promise<Game[]>;
  findCompletedGames(teamId?: number, limit?: number): Promise<Game[]>;
  
  // Season type queries - All return Games WITH team relations
  findPreseasonGames(teamId?: number, seasonYear?: number): Promise<Game[]>;
  findRegularSeasonGames(teamId?: number, seasonYear?: string): Promise<Game[]>;
  findRegularSeasonGameByWeek(teamId?: number, seasonYear?: string, week?: number): Promise<Game[]>;
  findAllGamesForSeason(teamId?: number, seasonYear?: string): Promise<Game[]>;

   // 🔽 NEW
  findPlayoffGamesBySeason(seasonYear: number): Promise<PlayoffGameSummary[]>;
  
  // Business logic helpers
  checkGameConflict(
    homeTeamId: number,
    awayTeamId: number,
    gameDate: Date,
    seasonYear: string
  ): Promise<boolean>;

  // ESPN integration helpers
  findTeamIdByEspnTeamId(espnTeamId: string): Promise<number | null>;
  findTeamIdByAbbrev(abbreviation: string): Promise<number | null>;

  // Upsert for ESPN sync - Returns Game WITH team relations
  /*
  upsertByKey(
  where: { espnCompetitionId: string },
  data: any
): Promise<Game>; */

  upsertByKey(
    where: {
      espnCompetitionId: string;
    },
    data: {
      readonly seasonYear: string;
      readonly gameWeek: number;
      readonly seasonType: number;
      readonly gameDate: Date | null;
      readonly homeTeamId: number;
      readonly awayTeamId: number;
      readonly homeScore: number | null;
      readonly awayScore: number | null;
      readonly gameStatus: string | null;
      readonly espnEventId: string;
      readonly espnCompetitionId: string;
    }
  ): Promise<Game>;


  // Optional: Method to explicitly fetch with teams (for backward compatibility)
  findByIdWithTeams?(id: number): Promise<{ 
    game: Game; 
    homeTeam: any; 
    awayTeam: any;
  } | null>;

}