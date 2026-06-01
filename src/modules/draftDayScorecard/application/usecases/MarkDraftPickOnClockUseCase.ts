import { DraftPick_status } from '@prisma/client';
import { IDraftDayScorecardRepository } from '../../domain/repositories/IDraftDayScorecardRepository';
import { DraftPickResponseDto } from '../dtos/DraftDayScorecardDtos';
import { mapDraftPickToDto } from '../mappers/DraftDayScorecardMapper';

export class MarkDraftPickOnClockUseCase {
  public constructor(
    private readonly repository: IDraftDayScorecardRepository,
  ) {}

  public async execute(
    draftPickId: number,
    changedByPersonId: number | null,
  ): Promise<DraftPickResponseDto> {
    const pick = await this.repository.updatePick(
      draftPickId,
      {
        status: DraftPick_status.ON_CLOCK,
      },
      changedByPersonId,
      'MARK_ON_CLOCK',
    );

    return mapDraftPickToDto(pick);
  }
}