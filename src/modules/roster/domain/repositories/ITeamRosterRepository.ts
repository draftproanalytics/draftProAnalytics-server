import type { TeamRosterPlayerDto } from '../../application/dto/teamRosterPlayer.dto'

export interface ITeamRosterRepository {
  findCurrentByTeamId(teamId: number): Promise<TeamRosterPlayerDto[]>
}
