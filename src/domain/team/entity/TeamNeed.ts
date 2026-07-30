import type { TeamNeed as PrismaTeamNeed } from '@prisma/client'

export class TeamNeed {
  public constructor(
    public readonly id: number | undefined,
    public readonly teamId: number,
    public readonly position: string,
    public readonly priority: number,
    public readonly draftYear: number,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  public static fromDatabase(data: PrismaTeamNeed): TeamNeed {
    return new TeamNeed(
      data.id,
      data.teamId,
      data.position,
      data.priority,
      data.draftYear,
      data.createdAt ?? undefined,
      data.updatedAt ?? undefined
    )
  }

  public isHighPriority(): boolean {
    return this.priority <= 2
  }

  public isMediumPriority(): boolean {
    return this.priority >= 3 && this.priority <= 5
  }

  public isLowPriority(): boolean {
    return this.priority > 5
  }
}
