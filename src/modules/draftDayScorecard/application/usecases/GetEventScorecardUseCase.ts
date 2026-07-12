import { IDraftDayScorecardRepository } from '../../domain/repositories/IDraftDayScorecardRepository';
import { EventScorecardResponseDto } from '../dtos/DraftDayScorecardDtos';
import {
  mapDraftEventToDto,
  mapDraftPickToDto,
  mapDraftTeamScorecardToDto,
} from '../mappers/DraftDayScorecardMapper';

export class GetEventScorecardUseCase {
  public constructor(
    private readonly repository: IDraftDayScorecardRepository,
  ) {}

  public async execute(
    draftEventId: number,
  ): Promise<EventScorecardResponseDto | null> {
    const result = await this.repository.getEventScorecard(draftEventId);

    if (result === null) {
      return null;
    }

    return {
      event: mapDraftEventToDto(result.event),
      teams: result.teams.map(mapDraftTeamScorecardToDto),
      picks: result.picks.map(mapDraftPickToDto),
    };
  }
}