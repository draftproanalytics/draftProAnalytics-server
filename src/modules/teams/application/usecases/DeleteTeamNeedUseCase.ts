import type { ITeamNeedRepository } from '../../domain/services/repositories/ITeamNeedRepository'

export class DeleteTeamNeedUseCase {
  public constructor(private readonly teamNeedRepo: ITeamNeedRepository) {}

  public async execute(teamId: number, draftYear: number, position: string): Promise<void> {
    const normalizedPosition = position.trim().toUpperCase()
    if (normalizedPosition.length === 0 || normalizedPosition.length > 10) throw new Error('position must be 1..10 characters')
    if (!Number.isInteger(draftYear) || draftYear < 1936 || draftYear > 2155) throw new Error('draftYear must be a valid year')
    await this.teamNeedRepo.deleteByTeamIdDraftYearAndPosition(teamId, draftYear, normalizedPosition)
  }
}
