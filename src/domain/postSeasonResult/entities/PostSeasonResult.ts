// src/domain/postSeasonResult/entities/PostSeasonResult.ts
import { ValidationError } from '@/shared/errors/AppError';
import { Team } from '@/domain/team/entities/Team';

export interface PostSeasonResultProps {
  id?: number;
  playoffYear?: number;
  lastRoundReached?: string;
  winLose?: string;
  opponentScore?: number;
  teamScore?: number;
  teamId?: number;
  team?: Team;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PostSeasonResult {
  private constructor(private props: PostSeasonResultProps) {
    this.validate();
  }

  public static create(props: PostSeasonResultProps): PostSeasonResult {
    return new PostSeasonResult(props);
  }

  // ✅ FIXED: fromPersistence now expects the CORRECT Team structure from your database
  public static fromPersistence(data: {
    id: number;
    playoffYear: number | null;
    lastRoundReached: string | null;
    winLose: string | null;
    opponentScore: number | null;
    teamScore: number | null;
    teamId: number | null;
    createdAt?: Date | null;
    updatedAt?: Date | null;
    team?: {
      id: number;
      name: string;
      city: string | null;
      state: string | null;
      conference: string | null;
      division: string | null;
      stadium: string | null;
      scheduleId: number | null;
      espnTeamId: number | null;
      abbreviation: string | null;
    } | null;
    Team?: {
      id: number;
      name: string;
      city: string | null;
      state: string | null;
      conference: string | null;
      division: string | null;
      stadium: string | null;
      scheduleId: number | null;
      espnTeamId: number | null;
      abbreviation: string | null;
    } | null;
  }): PostSeasonResult {
    const persistedTeam = data.team ?? data.Team;

    return new PostSeasonResult({
      id: data.id,
      playoffYear: data.playoffYear || undefined,
      lastRoundReached: data.lastRoundReached || undefined,
      winLose: data.winLose || undefined,
      opponentScore: data.opponentScore || undefined,
      teamScore: data.teamScore || undefined,
      teamId: data.teamId || undefined,
      team: persistedTeam ? Team.fromPersistence(persistedTeam) : undefined,
      createdAt: data.createdAt || undefined,
      updatedAt: data.updatedAt || undefined,
    });
  }

  private validate(): void {
    if (this.props.playoffYear && (this.props.playoffYear < 1990 || this.props.playoffYear > 2030)) {
      throw new ValidationError('Playoff year must be between 1990 and 2030');
    }

    if (this.props.lastRoundReached && this.props.lastRoundReached.length > 45) {
      throw new ValidationError('Last round reached cannot exceed 45 characters');
    }

    if (this.props.winLose && this.props.winLose.length !== 1) {
      throw new ValidationError('Win/Lose must be a single character');
    }

    if (this.props.opponentScore && this.props.opponentScore < 0) {
      throw new ValidationError('Opponent score cannot be negative');
    }

    if (this.props.teamScore && this.props.teamScore < 0) {
      throw new ValidationError('Team score cannot be negative');
    }
  }

  // Getters
  public get id(): number | undefined {
    return this.props.id;
  }

  public get playoffYear(): number | undefined {
    return this.props.playoffYear;
  }

  public get lastRoundReached(): string | undefined {
    return this.props.lastRoundReached;
  }

  public get winLose(): string | undefined {
    return this.props.winLose;
  }

  public get opponentScore(): number | undefined {
    return this.props.opponentScore;
  }

  public get teamScore(): number | undefined {
    return this.props.teamScore;
  }

  public get teamId(): number | undefined {
    return this.props.teamId;
  }

  public get team(): Team | undefined {
    return this.props.team;
  }

  public get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  public get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  // Business methods
  public updateResult(teamScore: number, opponentScore: number, winLose: string): void {
    if (teamScore < 0 || opponentScore < 0) {
      throw new ValidationError('Scores cannot be negative');
    }

    if (winLose.length !== 1) {
      throw new ValidationError('Win/Lose must be a single character');
    }

    this.props.teamScore = teamScore;
    this.props.opponentScore = opponentScore;
    this.props.winLose = winLose;
    this.props.updatedAt = new Date();
  }

  public updatePlayoffProgress(lastRoundReached: string): void {
    if (lastRoundReached.length > 45) {
      throw new ValidationError('Last round reached cannot exceed 45 characters');
    }

    this.props.lastRoundReached = lastRoundReached;
    this.props.updatedAt = new Date();
  }

  public isWin(): boolean {
    return this.props.winLose?.toUpperCase() === 'W';
  }

  public getScoreDifferential(): number | undefined {
    if (this.props.teamScore !== undefined && this.props.opponentScore !== undefined) {
      return this.props.teamScore - this.props.opponentScore;
    }
    return undefined;
  }

  public getTeamName(): string | undefined {
    return this.props.team?.name;
  }

  public getTeamFullName(): string | undefined {
    return this.props.team?.getFullName();
  }

  public getTeamLocation(): string | null {
    const location = this.props.team?.getLocation();
    return location ? location.getFormattedLocation() : null;

    // OR the shorter version:
    // return this.props.team?.getLocation()?.getFormattedLocation();
  }

  // ✅ toPersistence: Convert entity back to Prisma format
  public toPersistence(): {
    id?: number;
    playoffYear?: number;
    lastRoundReached?: string;
    winLose?: string;
    opponentScore?: number;
    teamScore?: number;
    teamId?: number;
    createdAt?: Date;
    updatedAt?: Date;
  } {
    return {
      id: this.props.id,
      playoffYear: this.props.playoffYear,
      lastRoundReached: this.props.lastRoundReached,
      winLose: this.props.winLose,
      opponentScore: this.props.opponentScore,
      teamScore: this.props.teamScore,
      teamId: this.props.teamId,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }

  public equals(other: PostSeasonResult): boolean {
    return this.props.id === other.props.id;
  }
}