import { DraftPick_status } from '@prisma/client';
import { IDraftDayScorecardRepository } from '../../domain/repositories/IDraftDayScorecardRepository';
import {
  CompleteDraftPickRequestDto,
  DraftPickResponseDto,
} from '../dtos/DraftDayScorecardDtos';
import { mapDraftPickToDto } from '../mappers/DraftDayScorecardMapper';

export class CompleteDraftPickUseCase {
  public constructor(
    private readonly repository: IDraftDayScorecardRepository,
  ) {}

  public async execute(
    draftPickId: number,
    request: CompleteDraftPickRequestDto,
    changedByPersonId: number | null,
  ): Promise<DraftPickResponseDto> {
    const pick = await this.repository.updatePick(
      draftPickId,
      {
        ...request,
        status: DraftPick_status.PICKED,
        selectedAt: new Date(),
      },
      changedByPersonId,
      'COMPLETE_PICK',
    );

    return mapDraftPickToDto(pick);
  }
}