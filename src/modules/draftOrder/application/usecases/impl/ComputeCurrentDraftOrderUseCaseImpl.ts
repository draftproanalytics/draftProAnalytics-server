import type { ComputeCurrentDraftOrderUseCase, ComputeCurrentDraftOrderParams } from '../ComputeCurrentDraftOrderUseCase'
import type { DraftOrderSnapshotDetailDto } from '@/modules/draftOrder/application/dtos/DraftOrderSnapshotDetailDto'
import type { DraftOrderSnapshotRepository } from '@/modules/draftOrder/domain/repositories/DraftOrderSnapshotRepository'
import type { GameFactsRepository } from '@/modules/draftOrder/domain/repositories/GameFactsRepository'
import { ComputeCurrentDraftOrderService } from '@/modules/draftOrder/application/services/ComputeCurrentDraftOrderService'

export class ComputeCurrentDraftOrderUseCaseImpl implements ComputeCurrentDraftOrderUseCase {
  public constructor(
    private readonly gameFactsRepo: GameFactsRepository,
    private readonly snapshotRepo: DraftOrderSnapshotRepository,
    private readonly svc: ComputeCurrentDraftOrderService
  ) {}

  public async execute(params: ComputeCurrentDraftOrderParams): Promise<DraftOrderSnapshotDetailDto> {
    const [teams, games] = await Promise.all([
      this.gameFactsRepo.listTeams(),
      this.gameFactsRepo.listFinalGames({
        seasonYear: params.seasonYear,
        seasonType: params.seasonType,
        throughWeek: params.throughWeek,
      }),
    ])

    const { snapshot } = this.svc.compute({
      seasonYear: params.seasonYear,
        seasonType: params.seasonType,
      throughWeek: params.throughWeek,
      teams,
      games,
    })

    // repo.createSnapshot() now handles idempotency (P2002 -> fetch existing)
    return this.snapshotRepo.createSnapshot(snapshot)
  }
}
