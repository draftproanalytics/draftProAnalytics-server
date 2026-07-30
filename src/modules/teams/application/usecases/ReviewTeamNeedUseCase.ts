import type { ITeamNeedRepository } from '../../domain/services/repositories/ITeamNeedRepository'

export class ReviewTeamNeedUseCase {
  public constructor(private readonly repository: ITeamNeedRepository) {}

  public execute(id: number, status: 'APPROVED' | 'REJECTED', reviewedByPersonId?: number) {
    if (!Number.isInteger(id) || id <= 0) throw new Error('id must be a positive integer')
    return this.repository.review(id, status, reviewedByPersonId)
  }
}
