import type { TeamRosterPlayerDto } from '../dto/teamRosterPlayer.dto'
import type { ITeamRosterRepository } from '../../domain/repositories/ITeamRosterRepository'

export class GetTeamRosterUseCase {
  public constructor(private readonly teamRosterRepository: ITeamRosterRepository) {}

  public async execute(teamId: number): Promise<TeamRosterPlayerDto[]> {
    return this.teamRosterRepository.findCurrentByTeamId(teamId)
  }
}
