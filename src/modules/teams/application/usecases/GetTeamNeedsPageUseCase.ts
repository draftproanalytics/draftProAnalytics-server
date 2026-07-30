import type { ITeamNeedRepository } from '../../domain/services/repositories/ITeamNeedRepository'
import type { ITeamRosterRepository } from '../../domain/services/repositories/ITeamRosterRepository'
import { TeamNeedsAnalyzerService } from '../../domain/services/TeamNeedsAnalyzerService'
import type { TeamNeedsPageDto } from '../../domain/dtos/TeamNeedDtos'

export interface GetTeamNeedsPageInput {
  teamId: number;
  evaluationYear?: number;
  draftYear: number;
}

export class GetTeamNeedsPageUseCase {
  public constructor(
    private readonly teamNeedRepo: ITeamNeedRepository,
    private readonly rosterRepo: ITeamRosterRepository,
    private readonly analyzer: TeamNeedsAnalyzerService
  ) {}

  public async execute(input: GetTeamNeedsPageInput): Promise<TeamNeedsPageDto> {
    const evaluationYear = input.evaluationYear ?? new Date().getFullYear()
    const [persistedNeeds, roster] = await Promise.all([
      this.teamNeedRepo.listByTeamIdAndDraftYear(input.teamId, input.draftYear),
      this.rosterRepo.getCurrentRoster(input.teamId)
    ])
    const suggestions = this.analyzer.analyze(roster, { evaluationYear, draftYear: input.draftYear })

    return { teamId: input.teamId, evaluationYear, draftYear: input.draftYear, persistedNeeds, suggestions }
  }
}
