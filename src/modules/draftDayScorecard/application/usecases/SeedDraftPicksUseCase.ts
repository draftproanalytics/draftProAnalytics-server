import { IDraftDayScorecardRepository } from '../../domain/repositories/IDraftDayScorecardRepository';
import {
  DraftPickResponseDto,
  SeedDraftPicksRequestDto,
} from '../dtos/DraftDayScorecardDtos';
import { mapDraftPickToDto } from '../mappers/DraftDayScorecardMapper';

export class SeedDraftPicksUseCase {
  public constructor(
    private readonly repository: IDraftDayScorecardRepository,
  ) {}

  public async execute(
    draftEventId: number,
    request: SeedDraftPicksRequestDto,
    changedByPersonId: number | null,
  ): Promise<DraftPickResponseDto[]> {
    const event = await this.repository.getEventById(draftEventId);

    if (event === null) {
      throw new Error('Draft event not found.');
    }

    const picks = await this.repository.seedPicks(
      draftEventId,
      event.draftYear,
      request.picks,
      changedByPersonId,
    );

    return picks.map(mapDraftPickToDto);
  }
}