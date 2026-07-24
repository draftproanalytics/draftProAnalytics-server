// src/application/postSeasonResult/services/PostSeasonResultService.ts
import { IPostSeasonResultRepository } from '@/domain/postSeasonResult/repositories/IPostSeasonResultRepository';
import { PostSeasonResult } from '@/domain/postSeasonResult/entities/PostSeasonResult';
import { NotFoundError, ConflictError } from '@/shared/errors/AppError';
import { PaginatedResponse, PaginationParams } from '@/shared/types/common';
import {
  CreatePostSeasonResultDto,
  UpdatePostSeasonResultDto,
  PostSeasonResultFiltersDto,
  PostSeasonResultResponseDto,
  TeamPlayoffHistoryQuery,
  PlayoffYearQuery,
} from '../dto/PostSeasonResultDto';

export class PostSeasonResultService {
  constructor(private readonly postSeasonResultRepository: IPostSeasonResultRepository) {}

  async createPostSeasonResult(dto: CreatePostSeasonResultDto): Promise<PostSeasonResultResponseDto> {
    // Business logic for creation
    // Check if a result already exists for this team and year
    if (dto.teamId && dto.playoffYear) {
      const existingResult = await this.postSeasonResultRepository.findByTeamAndYear(dto.teamId, dto.playoffYear);
      if (existingResult) {
        throw new ConflictError(`PostSeason result already exists for team ${dto.teamId} in year ${dto.playoffYear}`);
      }
    }

    // Create the entity
    const postSeasonResult = PostSeasonResult.create({
      playoffYear: dto.playoffYear,
      lastRoundReached: dto.lastRoundReached,
      winLose: dto.winLose?.toUpperCase(),
      opponentScore: dto.opponentScore,
      teamScore: dto.teamScore,
      teamId: dto.teamId,
      createdAt: new Date(),
    });

    const savedPostSeasonResult = await this.postSeasonResultRepository.save(postSeasonResult);
    return this.toResponseDto(savedPostSeasonResult);
  }

  async getPostSeasonResultById(id: number): Promise<PostSeasonResultResponseDto> {
    const postSeasonResult = await this.postSeasonResultRepository.findById(id);
    if (!postSeasonResult) {
      throw new NotFoundError('PostSeasonResult', id);
    }
    return this.toResponseDto(postSeasonResult);
  }

  async getAllPostSeasonResults(
    filters?: PostSeasonResultFiltersDto,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<PostSeasonResultResponseDto>> {
    const result = await this.postSeasonResultRepository.findAll(filters, pagination);
    return {
      data: result.data.map((postSeasonResult) => this.toResponseDto(postSeasonResult)),
      pagination: result.pagination,
    };
  }

  async updatePostSeasonResult(id: number, dto: UpdatePostSeasonResultDto): Promise<PostSeasonResultResponseDto> {
    const existingPostSeasonResult = await this.postSeasonResultRepository.findById(id);
    if (!existingPostSeasonResult) {
      throw new NotFoundError('PostSeasonResult', id);
    }

    // Business logic for updates
    // Check for conflicts if teamId and playoffYear are being changed
    if (dto.teamId && dto.playoffYear) {
      const conflictingResult = await this.postSeasonResultRepository.findByTeamAndYear(dto.teamId, dto.playoffYear);
      if (conflictingResult && conflictingResult.id !== id) {
        throw new ConflictError(`PostSeason result already exists for team ${dto.teamId} in year ${dto.playoffYear}`);
      }
    }

    // Apply changes to the entity
    if (dto.teamScore !== undefined && dto.opponentScore !== undefined && dto.winLose !== undefined) {
      existingPostSeasonResult.updateResult(dto.teamScore, dto.opponentScore, dto.winLose.toUpperCase());
    }

    if (dto.lastRoundReached !== undefined) {
      existingPostSeasonResult.updatePlayoffProgress(dto.lastRoundReached);
    }

    // Update other fields through reconstruction if needed
    const updatedPostSeasonResult = PostSeasonResult.create({
      id: existingPostSeasonResult.id,
      playoffYear: dto.playoffYear ?? existingPostSeasonResult.playoffYear,
      lastRoundReached: dto.lastRoundReached ?? existingPostSeasonResult.lastRoundReached,
      winLose: dto.winLose?.toUpperCase() ?? existingPostSeasonResult.winLose,
      opponentScore: dto.opponentScore ?? existingPostSeasonResult.opponentScore,
      teamScore: dto.teamScore ?? existingPostSeasonResult.teamScore,
      teamId: dto.teamId ?? existingPostSeasonResult.teamId,
      team: existingPostSeasonResult.team,
      createdAt: existingPostSeasonResult.createdAt,
      updatedAt: new Date(),
    });

    const savedPostSeasonResult = await this.postSeasonResultRepository.update(id, updatedPostSeasonResult);
    return this.toResponseDto(savedPostSeasonResult);
  }

  async deletePostSeasonResult(id: number): Promise<void> {
    const postSeasonResult = await this.postSeasonResultRepository.findById(id);
    if (!postSeasonResult) {
      throw new NotFoundError('PostSeasonResult', id);
    }

    await this.postSeasonResultRepository.delete(id);
  }

  async postSeasonResultExists(id: number): Promise<boolean> {
    return this.postSeasonResultRepository.exists(id);
  }

  // Domain-specific business methods
  async getTeamPlayoffHistory(query: TeamPlayoffHistoryQuery): Promise<PostSeasonResultResponseDto[]> {
    const results = await this.postSeasonResultRepository.getTeamPlayoffHistory(query.teamId);
    
    // Filter by year if specified
    const filteredResults = query.year 
      ? results.filter(result => result.playoffYear === query.year)
      : results;

    return filteredResults.map(result => this.toResponseDto(result));
  }

  async getPlayoffResultsByYear(query: PlayoffYearQuery): Promise<PostSeasonResultResponseDto[]> {
    const results = await this.postSeasonResultRepository.findByPlayoffYear(query.year);
    return results.map(result => this.toResponseDto(result));
  }

  async getTeamWins(teamId: number): Promise<PostSeasonResultResponseDto[]> {
    const wins = await this.postSeasonResultRepository.getWinsByTeam(teamId);
    return wins.map(result => this.toResponseDto(result));
  }

  async getTeamLosses(teamId: number): Promise<PostSeasonResultResponseDto[]> {
    const losses = await this.postSeasonResultRepository.getLossesByTeam(teamId);
    return losses.map(result => this.toResponseDto(result));
  }

  async getTeamPlayoffStats(teamId: number): Promise<{
    totalGames: number;
    wins: number;
    losses: number;
    winPercentage: number;
    averageScoreDifferential: number;
  }> {
    const allResults = await this.postSeasonResultRepository.getTeamPlayoffHistory(teamId);
    
    const stats = allResults.reduce((acc, result) => {
      acc.totalGames++;
      
      if (result.isWin()) {
        acc.wins++;
      } else {
        acc.losses++;
      }

      const scoreDiff = result.getScoreDifferential();
      if (scoreDiff !== undefined) {
        acc.totalScoreDifferential += scoreDiff;
        acc.gamesWithScores++;
      }

      return acc;
    }, {
      totalGames: 0,
      wins: 0,
      losses: 0,
      totalScoreDifferential: 0,
      gamesWithScores: 0,
    });

    return {
      totalGames: stats.totalGames,
      wins: stats.wins,
      losses: stats.losses,
      winPercentage: stats.totalGames > 0 ? (stats.wins / stats.totalGames) * 100 : 0,
      averageScoreDifferential: stats.gamesWithScores > 0 
        ? stats.totalScoreDifferential / stats.gamesWithScores 
        : 0,
    };
  }

  private toResponseDto(postSeasonResult: PostSeasonResult): PostSeasonResultResponseDto {
    const scoreDifferential = postSeasonResult.getScoreDifferential();
    
    // Format game result
    let gameResult: string | undefined;
    if (postSeasonResult.teamScore !== undefined && postSeasonResult.opponentScore !== undefined) {
      const winLose = postSeasonResult.isWin() ? 'Won' : 'Lost';
      gameResult = `${winLose} ${postSeasonResult.teamScore}-${postSeasonResult.opponentScore}`;
    }

    // Format playoff round
    const playoffRound = this.formatPlayoffRound(postSeasonResult.lastRoundReached);

    // ✅ FIXED: Now maps ALL the fields that exist in your database
    const team = postSeasonResult.team ? {
      id: postSeasonResult.team.id!,
      name: postSeasonResult.team.name,
      city: postSeasonResult.team.city,                    // ✅ YOUR DATABASE HAS THIS
      state: postSeasonResult.team.state,                  // ✅ YOUR DATABASE HAS THIS
      stadium: postSeasonResult.team.stadium,              // ✅ YOUR DATABASE HAS THIS
      conference: postSeasonResult.team.conference,        // ✅ YOUR DATABASE HAS THIS
      division: postSeasonResult.team.division,            // ✅ YOUR DATABASE HAS THIS
      scheduleId: postSeasonResult.team.scheduleId,        // ✅ YOUR DATABASE HAS THIS
      fullName: postSeasonResult.getTeamFullName(),        // ✅ Computed from city + name
    } : undefined;

    return {
      id: postSeasonResult.id!,
      gameId: postSeasonResult.gameId,
      playoffYear: postSeasonResult.playoffYear,
      lastRoundReached: postSeasonResult.lastRoundReached,
      winLose: postSeasonResult.winLose,
      opponentScore: postSeasonResult.opponentScore,
      teamScore: postSeasonResult.teamScore,
      teamId: postSeasonResult.teamId,
      scoreDifferential,
      isWin: postSeasonResult.isWin(),
      createdAt: postSeasonResult.createdAt?.toISOString(),
      updatedAt: postSeasonResult.updatedAt?.toISOString(),
      gameResult,
      playoffRound,
      team,
    };
  }

  private formatPlayoffRound(round?: string): string | undefined {
    if (!round) return undefined;

    const roundMap: { [key: string]: string } = {
      'WC': 'Wild Card',
      'DR': 'Divisional Round',
      'CR': 'Conference Round',
      'CCG': 'Conference Championship',
      'SB': 'Super Bowl',
      'WS': 'World Series',
      'F': 'Finals',
    };

    return roundMap[round.toUpperCase()] || round;
  }
}