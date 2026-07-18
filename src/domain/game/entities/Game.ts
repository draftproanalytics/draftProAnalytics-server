// src/domain/game/entities/Game.ts
/**
 * Game Entity - Domain Model
 * Represents a single NFL game with business logic
 */

import type { GameStatusType } from '../types/GameTypes';
import { isValidGameStatus } from '../types/GameTypes';

export interface GameProps {
  id?: number;
  seasonYear: string;
  gameWeek?: number;
  seasonType?: number;
  gameDate?: Date;
  homeTeamId: number;
  awayTeamId: number;
  gameLocation?: string;
  gameCity?: string;
  gameStateProvince?: string;
  gameCountry?: string;
  homeScore?: number;
  awayScore?: number;
  gameStatus?: GameStatusType;
  isPlayoff?: boolean;
  playoffRound?: string;
  espnEventId?: string;
  espnCompetitionId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations (attached by repository)
  homeTeam?: any;
  awayTeam?: any;
}

export class Game {
  private props: GameProps;

  private constructor(props: GameProps) {
    this.props = props;
  }

  // Factory method
  static create(props: GameProps): Game {
    // Business rule validations
    if (props.homeTeamId === props.awayTeamId) {
      throw new Error('Home team and away team cannot be the same');
    }

    if (props.gameWeek !== undefined && (props.gameWeek < 0 || props.gameWeek > 22)) {
      throw new Error('Game week must be between 1 and 22');
    }

    if (props.seasonType !== undefined && (props.seasonType < 1 || props.seasonType > 3)) {
      throw new Error('Preseason week must be between 1 and 3');
    }

    return new Game(props);
  }

  // Getters
  get id(): number | undefined {
    return this.props.id;
  }

  get seasonYear(): string {
    return this.props.seasonYear;
  }

  get gameWeek(): number | undefined {
    return this.props.gameWeek;
  }

  get seasonType(): number | undefined {
    return this.props.seasonType;
  }

  get gameDate(): Date | undefined {
    return this.props.gameDate;
  }

  get homeTeamId(): number {
    return this.props.homeTeamId;
  }

  get awayTeamId(): number {
    return this.props.awayTeamId;
  }

  get gameLocation(): string | undefined {
    return this.props.gameLocation;
  }

  get gameCity(): string | undefined {
    return this.props.gameCity;
  }

  get gameStateProvince(): string | undefined {
    return this.props.gameStateProvince;
  }

  get gameCountry(): string | undefined {
    return this.props.gameCountry;
  }

  get homeScore(): number | undefined {
    return this.props.homeScore;
  }

  get awayScore(): number | undefined {
    return this.props.awayScore;
  }

  get gameStatus(): string | undefined {
    return this.props.gameStatus;
  }

  get isPlayoff(): boolean {
    return this.props.isPlayoff ?? false;
  }

  get playoffRound(): string | undefined {
    return this.props.playoffRound;
  }

  get espnEventId(): string | undefined {
    return this.props.espnEventId;
  }

  get espnCompetitionId(): string | undefined {
    return this.props.espnCompetitionId;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  // Relation getters
  get homeTeam(): any | undefined {
    return this.props.homeTeam;
  }

  get awayTeam(): any | undefined {
    return this.props.awayTeam;
  }

  // Relation setters (used by repository to hydrate relations)
  set homeTeam(team: any) {
    this.props.homeTeam = team;
  }

  set awayTeam(team: any) {
    this.props.awayTeam = team;
  }

  // Business logic methods
  updateScore(homeScore: number, awayScore: number, status?: GameStatusType): void {
    if (homeScore < 0 || awayScore < 0) {
      throw new Error('Scores cannot be negative');
    }
    this.props.homeScore = homeScore;
    this.props.awayScore = awayScore;
    if (status) {
      if (!isValidGameStatus(status)) {
        throw new Error(`Invalid game status: ${status}`);
      }
      this.props.gameStatus = status;
    }
  }

  isCompleted(): boolean {
    return this.props.gameStatus === 'completed';
  }

  isTie(): boolean {
    return (
      this.isCompleted() &&
      this.props.homeScore !== undefined &&
      this.props.awayScore !== undefined &&
      this.props.homeScore === this.props.awayScore
    );
  }

  getWinningTeamId(): number | null {
    if (!this.isCompleted() || this.props.homeScore === undefined || this.props.awayScore === undefined) {
      return null;
    }
    if (this.props.homeScore > this.props.awayScore) {
      return this.props.homeTeamId;
    }
    if (this.props.awayScore > this.props.homeScore) {
      return this.props.awayTeamId;
    }
    return null; // Tie
  }

  isPreseason(): boolean {
    return this.props.seasonType !== undefined && this.props.seasonType === 1;
  }

  isRegularSeason(): boolean {
    return !this.isPreseason();
  }

  // Persistence methods
  toPersistence(): any {
    return {
      id: this.props.id,
      seasonYear: this.props.seasonYear,
      gameWeek: this.props.gameWeek,
      seasonType: this.props.seasonType,
      gameDate: this.props.gameDate,
      homeTeamId: this.props.homeTeamId,
      awayTeamId: this.props.awayTeamId,
      gameLocation: this.props.gameLocation,
      gameCity: this.props.gameCity,
      gameStateProvince: this.props.gameStateProvince,
      gameCountry: this.props.gameCountry,
      homeScore: this.props.homeScore,
      awayScore: this.props.awayScore,
      gameStatus: this.props.gameStatus,
      isPlayoff: this.props.isPlayoff,
      playoffRound: this.props.playoffRound,
      espnEventId: this.props.espnEventId,
      espnCompetitionId: this.props.espnCompetitionId,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }

  toPlainObject(): GameProps {
    return {
      id: this.props.id,
      seasonYear: this.props.seasonYear,
      gameWeek: this.props.gameWeek,
      seasonType: this.props.seasonType,
      gameDate: this.props.gameDate,
      homeTeamId: this.props.homeTeamId,
      awayTeamId: this.props.awayTeamId,
      gameLocation: this.props.gameLocation,
      gameCity: this.props.gameCity,
      gameStateProvince: this.props.gameStateProvince,
      gameCountry: this.props.gameCountry,
      homeScore: this.props.homeScore,
      awayScore: this.props.awayScore,
      gameStatus: this.props.gameStatus,
      isPlayoff: this.props.isPlayoff,
      playoffRound: this.props.playoffRound,
      espnEventId: this.props.espnEventId,
      espnCompetitionId: this.props.espnCompetitionId,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      homeTeam: this.props.homeTeam,
      awayTeam: this.props.awayTeam,
    };
  }

  static fromPersistence(data: any): Game {
    return new Game({
      id: data.id,
      seasonYear: data.seasonYear,
      gameWeek: data.gameWeek,
      seasonType: data.seasonType,
      gameDate: data.gameDate ? new Date(data.gameDate) : undefined,
      homeTeamId: data.homeTeamId,
      awayTeamId: data.awayTeamId,
      gameLocation: data.gameLocation,
      gameCity: data.gameCity,
      gameStateProvince: data.gameStateProvince,
      gameCountry: data.gameCountry,
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      gameStatus: data.gameStatus,
      isPlayoff: data.isPlayoff ?? false,
      playoffRound: data.playoffRound ?? undefined,
      espnEventId: data.espnEventId,
      espnCompetitionId: data.espnCompetitionId,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
    });
  }
}