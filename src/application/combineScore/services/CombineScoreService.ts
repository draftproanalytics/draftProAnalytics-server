import { ICombineScoreRepository } from '@/domain/combineScore/repositories/ICombineScoreRepository';
import { CombineScore } from '@/domain/combineScore/entities/CombineScore';
import { NotFoundError, ConflictError } from '@/shared/errors/AppError';
import { PaginatedResponse, PaginationParams } from '@/shared/types/common';
import {
  CreateCombineScoreDto,
  UpdateCombineScoreDto,
  CombineScoreFiltersDto,
  CombineScoreResponseDto,
  CombineScoreWorkspaceFiltersDto,
  CombineScoreWorkspaceItemDto,
  TopPerformersDto,
  AthleticScoreRangeDto,
} from '../dto/CombineScoreDto';

export class CombineScoreService {
  constructor(private readonly combineScoreRepository: ICombineScoreRepository) {}

  async createCombineScore(dto: CreateCombineScoreDto): Promise<CombineScoreResponseDto> {
    if (dto.playerId) {
      const existing = await this.combineScoreRepository.findByPlayerId(dto.playerId);
      if (existing) throw new ConflictError(`Player ${dto.playerId} already has combine scores recorded`);
    }
    if (dto.prospectId) {
      const existing = await this.combineScoreRepository.findByProspectId(dto.prospectId);
      if (existing) throw new ConflictError(`Prospect ${dto.prospectId} already has combine measurements recorded`);
    }

    const saved = await this.combineScoreRepository.save(CombineScore.create(dto));
    return this.toResponseDto(saved);
  }

  async getCombineScoreById(id: number): Promise<CombineScoreResponseDto> {
    const score = await this.combineScoreRepository.findById(id);
    if (!score) throw new NotFoundError('CombineScore', id);
    return this.toResponseDto(score);
  }

  async getAllCombineScores(filters?: CombineScoreFiltersDto, pagination?: PaginationParams): Promise<PaginatedResponse<CombineScoreResponseDto>> {
    const result = await this.combineScoreRepository.findAll(filters, pagination);
    return { data: result.data.map((score) => this.toResponseDto(score)), pagination: result.pagination };
  }

  async getWorkspace(
    filters?: CombineScoreWorkspaceFiltersDto,
    pagination?: PaginationParams,
  ): Promise<PaginatedResponse<CombineScoreWorkspaceItemDto>> {
    const result = await this.combineScoreRepository.findWorkspace(filters, pagination);
    return {
      data: result.data.map(({ prospect, score }) => ({
        prospect: { ...prospect, fullName: `${prospect.firstName} ${prospect.lastName}` },
        combineScore: score ? this.toResponseDto(score) : undefined,
        combineStatus: !score ? 'MISSING' : score.isCompleteWorkout() ? 'COMPLETE' : 'PARTIAL',
      })),
      pagination: result.pagination,
    };
  }

  async updateCombineScore(id: number, dto: UpdateCombineScoreDto): Promise<CombineScoreResponseDto> {
    const existing = await this.combineScoreRepository.findById(id);
    if (!existing) throw new NotFoundError('CombineScore', id);

    if (dto.playerId && dto.playerId !== existing.playerId) {
      const conflict = await this.combineScoreRepository.findByPlayerId(dto.playerId);
      if (conflict && conflict.id !== id) throw new ConflictError(`Player ${dto.playerId} already has combine scores recorded`);
    }
    if (dto.prospectId && dto.prospectId !== existing.prospectId) {
      const conflict = await this.combineScoreRepository.findByProspectId(dto.prospectId);
      if (conflict && conflict.id !== id) throw new ConflictError(`Prospect ${dto.prospectId} already has combine measurements recorded`);
    }

    const updated = CombineScore.create({
      id: existing.id,
      playerId: dto.playerId ?? existing.playerId,
      prospectId: dto.prospectId ?? existing.prospectId,
      height: dto.height ?? existing.height,
      weight: dto.weight ?? existing.weight,
      handSize: dto.handSize ?? existing.handSize,
      armLength: dto.armLength ?? existing.armLength,
      fortyTime: dto.fortyTime ?? existing.fortyTime,
      tenYardSplit: dto.tenYardSplit ?? existing.tenYardSplit,
      twentyYardShuttle: dto.twentyYardShuttle ?? existing.twentyYardShuttle,
      threeCone: dto.threeCone ?? existing.threeCone,
      verticalLeap: dto.verticalLeap ?? existing.verticalLeap,
      broadJump: dto.broadJump ?? existing.broadJump,
      benchPress: dto.benchPress ?? existing.benchPress,
    });
    return this.toResponseDto(await this.combineScoreRepository.update(id, updated));
  }

  async deleteCombineScore(id: number): Promise<void> {
    if (!(await this.combineScoreRepository.findById(id))) throw new NotFoundError('CombineScore', id);
    await this.combineScoreRepository.delete(id);
  }

  async combineScoreExists(id: number): Promise<boolean> { return this.combineScoreRepository.exists(id); }

  async getCombineScoreByPlayerId(playerId: number): Promise<CombineScoreResponseDto | null> {
    const score = await this.combineScoreRepository.findByPlayerId(playerId);
    return score ? this.toResponseDto(score) : null;
  }

  async getCombineScoreByProspectId(prospectId: number): Promise<CombineScoreResponseDto | null> {
    const score = await this.combineScoreRepository.findByProspectId(prospectId);
    return score ? this.toResponseDto(score) : null;
  }

  async getCombineScoresByPlayerIds(playerIds: number[]): Promise<CombineScoreResponseDto[]> {
    return (await this.combineScoreRepository.findByPlayerIds(playerIds)).map((score) => this.toResponseDto(score));
  }

  async getTopPerformers(dto: TopPerformersDto): Promise<CombineScoreResponseDto[]> {
    return (await this.combineScoreRepository.findTopPerformers(dto.metric, dto.limit)).map((score) => this.toResponseDto(score));
  }

  async getCombineScoresByAthleticScore(dto: AthleticScoreRangeDto): Promise<CombineScoreResponseDto[]> {
    return (await this.combineScoreRepository.findByAthleticScoreRange(dto.minScore, dto.maxScore)).map((score) => this.toResponseDto(score));
  }

  async getAthleticRankings(): Promise<CombineScoreResponseDto[]> {
    const all = await this.combineScoreRepository.findAll({}, { page: 1, limit: 1000 });
    return all.data.map((score) => this.toResponseDto(score)).sort((a, b) => b.overallAthleticScore - a.overallAthleticScore);
  }

  async updateSpecificMetric(id: number, metric: string, value: number): Promise<CombineScoreResponseDto> {
    const score = await this.combineScoreRepository.findById(id);
    if (!score) throw new NotFoundError('CombineScore', id);
    switch (metric) {
      case 'fortyTime': score.updateFortyTime(value); break;
      case 'tenYardSplit': score.updateTenYardSplit(value); break;
      case 'verticalLeap': score.updateVerticalLeap(value); break;
      case 'broadJump': score.updateBroadJump(value); break;
      default: throw new Error(`Invalid metric: ${metric}`);
    }
    return this.toResponseDto(await this.combineScoreRepository.update(id, score));
  }

  private toResponseDto(score: CombineScore): CombineScoreResponseDto {
    return {
      id: score.id!, playerId: score.playerId, prospectId: score.prospectId,
      height: score.height, weight: score.weight, handSize: score.handSize, armLength: score.armLength,
      fortyTime: score.fortyTime, tenYardSplit: score.tenYardSplit, twentyYardShuttle: score.twentyYardShuttle,
      threeCone: score.threeCone, verticalLeap: score.verticalLeap, broadJump: score.broadJump, benchPress: score.benchPress,
      overallAthleticScore: score.getOverallAthleticScore(), isCompleteWorkout: score.isCompleteWorkout(),
      fortyTimeFormatted: score.fortyTime ? `${score.fortyTime.toFixed(2)}s` : undefined,
      verticalLeapFormatted: score.verticalLeap ? `${score.verticalLeap}"` : undefined,
      broadJumpFormatted: score.broadJump ? `${score.broadJump}"` : undefined,
    };
  }
}
