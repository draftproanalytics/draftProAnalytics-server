import { IDraftDayScorecardRepository } from '../../domain/repositories/IDraftDayScorecardRepository';
import {
  DraftPickResponseDto,
  UpdateDraftPickRequestDto,
} from '../dtos/DraftDayScorecardDtos';
import { mapDraftPickToDto } from '../mappers/DraftDayScorecardMapper';

export class UpdateDraftPickUseCase {
  public constructor(
    private readonly repository: IDraftDayScorecardRepository,
  ) {}

  public async execute(
    draftPickId: number,
    request: UpdateDraftPickRequestDto,
    changedByPersonId: number | null,
  ): Promise<DraftPickResponseDto> {
    const pick = await this.repository.updatePick(
      draftPickId,
      {
        ...request,
        selectedAt:
          request.selectedAt === undefined
            ? undefined
            : request.selectedAt === null
              ? null
              : new Date(request.selectedAt),
      },
      changedByPersonId,
      'UPDATE_PICK',
    );

    return mapDraftPickToDto(pick);
  }
}