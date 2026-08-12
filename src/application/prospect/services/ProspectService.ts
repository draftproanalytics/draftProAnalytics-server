import { IProspectRepository } from '@/domain/prospect/repositories/IProspectRepository';
import { ICombineScoreRepository } from '@/domain/combineScore/repositories/ICombineScoreRepository';
import { Prospect } from '@/domain/prospect/entities/Prospect';
import { CombineScore } from '@/domain/combineScore/entities/CombineScore';
import { NotFoundError, ConflictError } from '@/shared/errors/AppError';
import { PaginatedResponse, PaginationParams } from '@/shared/types/common';
import {
  CreateProspectDto,
  UpdateProspectDto,
  ProspectFiltersDto,
  ProspectResponseDto,
  UpdatePersonalInfoDto,
  UpdateCombineScoresDto,
  MarkAsDraftedDto,
  CombineScoreFilterDto,
  ProspectStatsDto,
  TopAthletesResponseDto,
} from '../dto/ProspectDto';

export class ProspectService {
  constructor(
    private readonly prospectRepository: IProspectRepository,
    private readonly combineScoreRepository: ICombineScoreRepository
  ) {}

  async createProspect(dto: CreateProspectDto): Promise<ProspectResponseDto> {
    const existing = await this.prospectRepository.findAll({ firstName: dto.firstName, lastName: dto.lastName, college: dto.college });
    if (existing.data.length > 0) {
      throw new ConflictError(`A prospect with the name ${dto.firstName} ${dto.lastName} from ${dto.college} already exists`);
    }
    const prospect = Prospect.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      position: dto.position,
      college: dto.college,
      homeCity: dto.homeCity,
      homeState: dto.homeState,
      drafted: dto.draftStatus === 'DRAFTED' || dto.drafted === true,
      draftStatus: dto.draftStatus ?? (dto.drafted ? 'DRAFTED' : 'PRE_DRAFT'),
      draftYear: dto.draftYear,
      teamId: dto.teamId,
      draftPickId: dto.draftPickId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return this.toResponseDto(await this.prospectRepository.save(prospect));
  }

  async getProspectById(id: number): Promise<ProspectResponseDto> {
    const prospect = await this.prospectRepository.findById(id);
    if (!prospect) throw new NotFoundError('Prospect', id);
    const combine = await this.combineScoreRepository.findByProspectId(id);
    return this.toResponseDto(prospect, combine ?? undefined);
  }

  async getAllProspects(filters?: ProspectFiltersDto, pagination?: PaginationParams): Promise<PaginatedResponse<ProspectResponseDto>> {
    return this.toPaginatedResponse(await this.prospectRepository.findAll(filters, pagination));
  }

  async updateProspect(id: number, dto: UpdateProspectDto): Promise<ProspectResponseDto> {
    const existing = await this.prospectRepository.findById(id);
    if (!existing) throw new NotFoundError('Prospect', id);
    const nextDraftStatus = dto.draftStatus ?? existing.draftStatus;
    const nextTeamId = nextDraftStatus === 'PRE_DRAFT' ? undefined : (dto.teamId ?? existing.teamId);
    const nextDraftPickId = nextDraftStatus === 'DRAFTED' ? (dto.draftPickId ?? existing.draftPickId) : undefined;

    const updated = Prospect.create({
      id: existing.id,
      firstName: dto.firstName ?? existing.firstName,
      lastName: dto.lastName ?? existing.lastName,
      position: dto.position ?? existing.position,
      college: dto.college ?? existing.college,
      homeCity: dto.homeCity ?? existing.homeCity,
      homeState: dto.homeState ?? existing.homeState,
      drafted: nextDraftStatus === 'DRAFTED',
      draftStatus: nextDraftStatus,
      draftYear: dto.draftYear ?? existing.draftYear,
      teamId: nextTeamId,
      draftPickId: nextDraftPickId,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });
    const saved = await this.prospectRepository.update(id, updated);
    const combine = await this.combineScoreRepository.findByProspectId(id);
    return this.toResponseDto(saved, combine ?? undefined);
  }

  async deleteProspect(id: number): Promise<void> {
    const prospect = await this.prospectRepository.findById(id);
    if (!prospect) throw new NotFoundError('Prospect', id);
    if (prospect.draftStatus !== 'PRE_DRAFT') throw new ConflictError('Cannot delete a prospect after the draft lifecycle has completed');
    await this.prospectRepository.delete(id);
  }

  async prospectExists(id: number): Promise<boolean> { return this.prospectRepository.exists(id); }

  async getProspectsByPosition(position: string, pagination?: PaginationParams): Promise<PaginatedResponse<ProspectResponseDto>> {
    return this.toPaginatedResponse(await this.prospectRepository.findByPosition(position, pagination));
  }

  async getProspectsByCollege(college: string, pagination?: PaginationParams): Promise<PaginatedResponse<ProspectResponseDto>> {
    return this.toPaginatedResponse(await this.prospectRepository.findByCollege(college, pagination));
  }

  async getUndraftedProspects(pagination?: PaginationParams): Promise<PaginatedResponse<ProspectResponseDto>> {
    return this.toPaginatedResponse(await this.prospectRepository.findUndrafted(pagination));
  }

  async getDraftedProspects(draftYear?: number, pagination?: PaginationParams): Promise<PaginatedResponse<ProspectResponseDto>> {
    return this.toPaginatedResponse(await this.prospectRepository.findDrafted(draftYear, pagination));
  }

  async getProspectsByTeam(teamId: number, pagination?: PaginationParams): Promise<PaginatedResponse<ProspectResponseDto>> {
    return this.toPaginatedResponse(await this.prospectRepository.findByTeam(teamId, pagination));
  }

  async updatePersonalInfo(id: number, dto: UpdatePersonalInfoDto): Promise<ProspectResponseDto> {
    const prospect = await this.prospectRepository.findById(id);
    if (!prospect) throw new NotFoundError('Prospect', id);
    prospect.updatePersonalInfo(dto.firstName, dto.lastName, dto.homeCity, dto.homeState);
    const saved = await this.prospectRepository.update(id, prospect);
    const combine = await this.combineScoreRepository.findByProspectId(id);
    return this.toResponseDto(saved, combine ?? undefined);
  }

  // Backward-compatible Prospect endpoint; CombineScore is now the only persistence target.
  async updateCombineScores(id: number, dto: UpdateCombineScoresDto): Promise<ProspectResponseDto> {
    const prospect = await this.prospectRepository.findById(id);
    if (!prospect) throw new NotFoundError('Prospect', id);
    const existing = await this.combineScoreRepository.findByProspectId(id);
    const combined = CombineScore.create({
      id: existing?.id,
      playerId: existing?.playerId,
      prospectId: id,
      height: dto.height ?? existing?.height,
      weight: dto.weight ?? existing?.weight,
      handSize: dto.handSize ?? existing?.handSize,
      armLength: dto.armLength ?? existing?.armLength,
      fortyTime: dto.fortyTime ?? existing?.fortyTime,
      tenYardSplit: dto.tenYardSplit ?? existing?.tenYardSplit,
      verticalLeap: dto.verticalLeap ?? existing?.verticalLeap,
      broadJump: dto.broadJump ?? existing?.broadJump,
      threeCone: dto.threeCone ?? existing?.threeCone,
      twentyYardShuttle: dto.twentyYardShuttle ?? existing?.twentyYardShuttle,
      benchPress: dto.benchPress ?? existing?.benchPress,
    });
    const savedCombine = existing?.id
      ? await this.combineScoreRepository.update(existing.id, combined)
      : await this.combineScoreRepository.save(combined);
    return this.toResponseDto(prospect, savedCombine);
  }

  async markAsDrafted(id: number, dto: MarkAsDraftedDto): Promise<ProspectResponseDto> {
    const prospect = await this.prospectRepository.findById(id);
    if (!prospect) throw new NotFoundError('Prospect', id);
    prospect.markAsDrafted(dto.teamId, dto.draftYear, dto.draftPickId);
    const saved = await this.prospectRepository.update(id, prospect);
    const combine = await this.combineScoreRepository.findByProspectId(id);
    return this.toResponseDto(saved, combine ?? undefined);
  }

  async markAsUndrafted(id: number): Promise<ProspectResponseDto> {
    const prospect = await this.prospectRepository.findById(id);
    if (!prospect) throw new NotFoundError('Prospect', id);
    prospect.markAsUndrafted();
    const saved = await this.prospectRepository.update(id, prospect);
    const combine = await this.combineScoreRepository.findByProspectId(id);
    return this.toResponseDto(saved, combine ?? undefined);
  }

  async getTopAthletes(limit: number = 10): Promise<TopAthletesResponseDto> {
    const prospects = await this.prospectRepository.findTopAthletes(limit);
    const combines = await this.combineScoreRepository.findByProspectIds(prospects.flatMap((p) => p.id ? [p.id] : []));
    const byProspectId = new Map(combines.flatMap((score) => score.prospectId ? [[score.prospectId, score] as const] : []));
    return {
      prospects: prospects.map((prospect) => this.toResponseDto(prospect, prospect.id ? byProspectId.get(prospect.id) : undefined)),
      limit,
      criteria: 'Based on canonical CombineScore athletic testing',
    };
  }

  async getProspectsByCombineScore(filters: CombineScoreFilterDto, pagination?: PaginationParams): Promise<PaginatedResponse<ProspectResponseDto>> {
    const result = await this.prospectRepository.findByCombineScore(
      filters.minFortyTime, filters.maxFortyTime, filters.minVerticalLeap, filters.maxVerticalLeap, pagination
    );
    return this.toPaginatedResponse(result);
  }

  async getProspectStats(): Promise<ProspectStatsDto> {
    const [allProspects, draftedProspects, undraftedProspects, udfaProspects, positionBreakdown, collegeBreakdown, averages] = await Promise.all([
      this.prospectRepository.findAll({}, { page: 1, limit: 100 }),
      this.prospectRepository.findDrafted(undefined, { page: 1, limit: 1 }),
      this.prospectRepository.findUndrafted({ page: 1, limit: 1 }),
      this.prospectRepository.findAll({ draftStatus: 'UDFA' }, { page: 1, limit: 1 }),
      this.prospectRepository.countByPosition(),
      this.prospectRepository.countByCollege(),
      this.combineScoreRepository.getMeasurementAverages(),
    ]);
    const rounded = (value?: number): number | undefined => value === undefined ? undefined : Math.round(value * 100) / 100;
    return {
      totalProspects: allProspects.pagination.total,
      draftedCount: draftedProspects.pagination.total,
      undraftedCount: undraftedProspects.pagination.total,
      udfaCount: udfaProspects.pagination.total,
      positionBreakdown,
      collegeBreakdown: collegeBreakdown.slice(0, 20),
      averageHeight: rounded(averages.height),
      averageWeight: rounded(averages.weight),
      averageFortyTime: rounded(averages.fortyTime),
      averageVerticalLeap: rounded(averages.verticalLeap),
      averageBenchPress: rounded(averages.benchPress),
    };
  }

  async findDuplicateProspects(): Promise<ProspectResponseDto[]> {
    const duplicates = await this.prospectRepository.findDuplicates();
    const combines = await this.combineScoreRepository.findByProspectIds(duplicates.flatMap((p) => p.id ? [p.id] : []));
    const byProspectId = new Map(combines.flatMap((score) => score.prospectId ? [[score.prospectId, score] as const] : []));
    return duplicates.map((prospect) => this.toResponseDto(prospect, prospect.id ? byProspectId.get(prospect.id) : undefined));
  }

  private async toPaginatedResponse(result: PaginatedResponse<Prospect>): Promise<PaginatedResponse<ProspectResponseDto>> {
    const ids = result.data.flatMap((prospect) => prospect.id ? [prospect.id] : []);
    const combines = await this.combineScoreRepository.findByProspectIds(ids);
    const byProspectId = new Map(combines.flatMap((score) => score.prospectId ? [[score.prospectId, score] as const] : []));
    return {
      data: result.data.map((prospect) => this.toResponseDto(prospect, prospect.id ? byProspectId.get(prospect.id) : undefined)),
      pagination: result.pagination,
    };
  }

  private toResponseDto(prospect: Prospect, combine?: CombineScore): ProspectResponseDto {
    return {
      id: prospect.id!,
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      fullName: prospect.getFullName(),
      position: prospect.position,
      college: prospect.college,
      homeCity: prospect.homeCity,
      homeState: prospect.homeState,
      drafted: prospect.draftStatus === 'DRAFTED',
      draftStatus: prospect.draftStatus,
      draftYear: prospect.draftYear,
      teamId: prospect.teamId,
      draftPickId: prospect.draftPickId,
      hasCompleteCombineScores: combine?.isCompleteWorkout() ?? false,
      athleteScore: combine?.getOverallAthleticScore() ?? 0,
      createdAt: prospect.createdAt ?? new Date(),
      updatedAt: prospect.updatedAt ?? new Date(),
    };
  }
}
