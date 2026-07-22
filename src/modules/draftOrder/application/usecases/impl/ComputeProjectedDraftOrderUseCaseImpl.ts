import type {
  ComputeProjectedDraftOrderParams,
  ComputeProjectedDraftOrderUseCase,
} from '@/modules/draftOrder/application/usecases/ComputeProjectedDraftOrderUseCase'
import type { DraftOrderSnapshotDetailDto } from '@/modules/draftOrder/application/dtos/DraftOrderSnapshotDetailDto'
import type { DraftOrderSnapshotRepository } from '@/modules/draftOrder/domain/repositories/DraftOrderSnapshotRepository'
import type { GameFactsRepository } from '@/modules/draftOrder/domain/repositories/GameFactsRepository'
import { ComputeCurrentDraftOrderService } from '@/modules/draftOrder/application/services/ComputeCurrentDraftOrderService'

export class ComputeProjectedDraftOrderUseCaseImpl implements ComputeProjectedDraftOrderUseCase {
  public constructor(
    private readonly gameFactsRepo: GameFactsRepository,
    private readonly snapshotRepo: DraftOrderSnapshotRepository,
    private readonly svc: ComputeCurrentDraftOrderService
  ) {}

  public async execute(params: ComputeProjectedDraftOrderParams): Promise<DraftOrderSnapshotDetailDto> {
    const [teams, games] = await Promise.all([
      this.gameFactsRepo.listTeams(),
      this.gameFactsRepo.listFinalGames({
        seasonYear: params.seasonYear,
        seasonType: params.seasonType,
        throughWeek: params.throughWeek,
      }),
    ])

    // Baseline projection: compute from final games through week; mark as projected and store strategy.
    const { snapshot } = this.svc.compute({
      seasonYear: params.seasonYear,
        seasonType: params.seasonType,
      throughWeek: params.throughWeek,
      teams,
      games,
      mode: 'projection',
      strategy: params.strategy,
    })

    return this.snapshotRepo.createSnapshot(snapshot)
  }
}
