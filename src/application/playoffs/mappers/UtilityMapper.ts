import { $Enums, PrismaClient } from '@prisma/client';
import type { GameStatus, PlayoffRound } from '@/utils/schedule/scheduleTypes'; // adjust path
import { prisma } from "@/infrastructure/database/prisma";

export class UtilityMapper {
  mapGameStatusToPrisma(status: GameStatus): $Enums.Game_gameStatus {
    switch (status) {
      case 'Scheduled':
        return 'scheduled';
      case 'In Progress':
        return 'in_progress';
      case 'Final':
        return 'final';
      case 'Postponed':
        return 'postponed';
      case 'Canceled':
        return 'canceled';
      default:
        // safe fallback – tune if you like
        return 'scheduled';
    }
  }

  mapPlayoffRoundToPrisma(round: PlayoffRound | null): $Enums.Game_playoffRound | null {
    if (!round) return null;

    switch (round) {
      case 'WILDCARD':
        return 'WILDCARD';
      case 'DIVISIONAL':
        return 'DIVISIONAL';
      case 'CONFERENCE':
        return 'CONFERENCE';
      case 'SUPERBOWL':
        return 'SUPERBOWL';
      default:
        return null;
    }
  }
  async mapMetaByEspnTeamId(id: number, prisma: PrismaClient): Promise<Map<number, { teamId: number }>> {
    const teams = await prisma.team.findMany({
      select: { id: true, espnTeamId: true },
    });

    const metaByEspnId = new Map<number, { teamId: number }>();

    for (const t of teams) {
      if (t.espnTeamId != null) {
        metaByEspnId.set(Number(t.espnTeamId), { teamId: t.id });
      }
    }
    return metaByEspnId;
  }
}
