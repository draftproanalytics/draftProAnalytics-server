// src/utils/teamHelper.ts
import type { PrismaClient } from '@prisma/client';
import type { NormalizedGameDTO } from './schedule/scheduleTypes';
import { createLogger } from './Logger';

const logger = createLogger('TeamHelper');

export class TeamHelper {
  constructor(private readonly prisma: PrismaClient) {}

  private async getTeamIdByEspnId(
    espnTeamId: number | null | undefined
  ): Promise<number | null> {
    if (!espnTeamId) {
      return null;
    }

    const team = await this.prisma.team.findFirst({
      where: { espnTeamId },
      select: { id: true },
    });

    if (!team) {
      return null;
    }

    return team.id;
  }

  async getHomeTeamId(event: NormalizedGameDTO): Promise<number | null> {
    const id = await this.getTeamIdByEspnId(event.homeTeamId);
    if (id == null) {
      logger.warn(
        `⚠️ [Import] Missing HOME team metadata for game ${event.id} (espnTeamId=${event.homeTeamId})`
      );
    }
    return id;
  }

  async getAwayTeamId(event: NormalizedGameDTO): Promise<number | null> {
    const id = await this.getTeamIdByEspnId(event.awayTeamId);
    if (id == null) {
      logger.warn(
        `⚠️ [Import] Missing AWAY team metadata for game ${event.id} (espnTeamId=${event.awayTeamId})`
      );
    }
    return id;
  }
}
