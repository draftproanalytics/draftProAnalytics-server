import { IDraftDayScorecardRepository } from '../../domain/repositories/IDraftDayScorecardRepository';
import { TeamScorecardResponseDto } from '../dtos/DraftDayScorecardDtos';
import {
  mapDraftEventToDto,
  mapDraftPickToDto,
  mapDraftTeamScorecardToDto,
} from '../mappers/DraftDayScorecardMapper';

export class GetTeamDraftScorecardUseCase {
  public constructor(
    private readonly repository: IDraftDayScorecardRepository,
  ) {}

  public async execute(
    draftEventId: number,
    teamId: number,
  ): Promise<TeamScorecardResponseDto | null> {
    const result = await this.repository.getTeamScorecard(draftEventId, teamId);

    if (result === null) {
      return null;
    }

    return {
      event: mapDraftEventToDto(result.event),
      teamScorecard:
        result.teamScorecard === null
          ? null
          : mapDraftTeamScorecardToDto(result.teamScorecard),
      picks: result.picks.map(mapDraftPickToDto),
    };
  }
}