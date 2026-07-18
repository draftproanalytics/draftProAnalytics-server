// src/application/game/dto/mapGameToResponse.ts
import type { GameResponseDto } from './GameDto'
import type { Game } from '@/domain/game/entities/Game'

export function mapGameToResponse(game: Game): GameResponseDto {
  const plain = game.toPlainObject()

  return {
    id: plain.id!,
    seasonYear: plain.seasonYear!,
    gameWeek: plain.gameWeek,
    seasonType: plain.seasonType,
    gameDate: plain.gameDate ? plain.gameDate.toISOString() : undefined,

    homeTeamId: plain.homeTeamId!,
    awayTeamId: plain.awayTeamId!,
    homeTeamName: plain.homeTeam?.name,
    awayTeamName: plain.awayTeam?.name,

    gameLocation: plain.gameLocation,
    gameCity: plain.gameCity,
    gameStateProvince: plain.gameStateProvince,
    gameCountry: plain.gameCountry,

    homeScore: plain.homeScore,
    awayScore: plain.awayScore,
    gameStatus: plain.gameStatus,
    isPlayoff: plain.isPlayoff ?? false,
    playoffRound: plain.playoffRound,

    fullLocation: [plain.gameLocation, plain.gameCity, plain.gameStateProvince, plain.gameCountry]
      .filter((p) => !!p && String(p).trim().length > 0)
      .join(', '),

    winningTeamId: ((): number | null => {
      // use entity’s business logic (safer)
      try { return (game as any).getWinningTeamId?.() ?? null } catch { return null }
    })(),
    isTie: ((): boolean => {
      try { return (game as any).isTie?.() ?? false } catch { return false }
    })(),

    createdAt: plain.createdAt ? plain.createdAt.toISOString() : undefined,
    updatedAt: plain.updatedAt ? plain.updatedAt.toISOString() : undefined,

    // keep full relations for logos/UX
    homeTeam: plain.homeTeam
      ? {
          id: plain.homeTeam.id,
          name: plain.homeTeam.name,
          city: plain.homeTeam.city ?? undefined,
          state: plain.homeTeam.state ?? undefined,
          conference: plain.homeTeam.conference ?? undefined,
          division: plain.homeTeam.division ?? undefined,
          stadium: plain.homeTeam.stadium ?? undefined,
        }
      : undefined,
    awayTeam: plain.awayTeam
      ? {
          id: plain.awayTeam.id,
          name: plain.awayTeam.name,
          city: plain.awayTeam.city ?? undefined,
          state: plain.awayTeam.state ?? undefined,
          conference: plain.awayTeam.conference ?? undefined,
          division: plain.awayTeam.division ?? undefined,
          stadium: plain.awayTeam.stadium ?? undefined,
        }
      : undefined,
  }
}
