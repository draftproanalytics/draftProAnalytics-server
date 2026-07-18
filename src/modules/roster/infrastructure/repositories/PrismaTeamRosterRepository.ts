import type { PrismaClient } from '@prisma/client'
import type { TeamRosterPlayerDto } from '../../application/dto/teamRosterPlayer.dto'
import type { ITeamRosterRepository } from '../../domain/repositories/ITeamRosterRepository'

export class PrismaTeamRosterRepository implements ITeamRosterRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findCurrentByTeamId(teamId: number): Promise<TeamRosterPlayerDto[]> {
    const memberships = await this.prisma.playerTeam.findMany({
      where: {
        teamId,
        OR: [
          { currentTeam: true },
          { isActive: 1 },
          { endYear: null },
        ],
      },
      select: {
        id: true,
        playerId: true,
        teamId: true,
        position: true,
        jerseyNumber: true,
        currentTeam: true,
        isActive: true,
        startYear: true,
        endYear: true,
        Player: {
          select: {
            firstName: true,
            lastName: true,
            age: true,
            yearEnteredLeague: true,
            university: true,
            status: true,
          },
        },
      },
      orderBy: [
        { position: 'asc' },
        { Player: { lastName: 'asc' } },
        { Player: { firstName: 'asc' } },
      ],
    })

    const currentYear = new Date().getFullYear()

    return memberships.map((membership) => ({
      playerTeamId: membership.id,
      playerId: membership.playerId,
      teamId: membership.teamId,
      playerName: `${membership.Player.firstName} ${membership.Player.lastName}`.trim(),
      firstName: membership.Player.firstName,
      lastName: membership.Player.lastName,
      position: membership.position,
      jerseyNumber: membership.jerseyNumber,
      currentTeam: membership.currentTeam,
      isActive: membership.isActive === 1 || membership.currentTeam,
      startYear: membership.startYear,
      endYear: membership.endYear,
      age: membership.Player.age,
      yearsExperience: membership.Player.yearEnteredLeague === null
        ? 0
        : Math.max(0, currentYear - membership.Player.yearEnteredLeague),
      university: membership.Player.university,
      status: membership.Player.status,
    }))
  }
}
