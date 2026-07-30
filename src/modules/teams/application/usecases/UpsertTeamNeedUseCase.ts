import type { ITeamNeedRepository } from '../../domain/services/repositories/ITeamNeedRepository'
import type { TeamNeedDto, TeamNeedSource, TeamNeedStatus } from '../../domain/dtos/TeamNeedDtos'

export interface UpsertTeamNeedInput {
  teamId: number;
  position: string;
  priority: number;
  draftYear: number;
  needScore?: number | null;
  source?: TeamNeedSource;
  status?: TeamNeedStatus;
}

export class UpsertTeamNeedUseCase {
  public constructor(private readonly teamNeedRepo: ITeamNeedRepository) {}

  public async execute(input: UpsertTeamNeedInput): Promise<TeamNeedDto> {
    const position = input.position.trim().toUpperCase()
    if (position.length === 0 || position.length > 10) throw new Error('position must be 1..10 characters')
    if (!Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) throw new Error('priority must be an integer 1..5')
    if (!Number.isInteger(input.draftYear) || input.draftYear < 1936 || input.draftYear > 2155) throw new Error('draftYear must be a valid year')

    return this.teamNeedRepo.upsert({ ...input, position })
  }
}
