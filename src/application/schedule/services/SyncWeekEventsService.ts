// src/application/schedule/services/SyncWeekEventsService.ts

import { fetchWeekEvents } from '@/espn/espnClient'
import { mapEspnEventToGame } from '@/espn/mappers/espnEventMapper'
import { IGameRepository } from '@/domain/game/repositories/IGameRepository'
import { ITeamRepository } from '@/domain/team/repositories/ITeamRepository'
import { NflSeasonType, toNflProviderWeek } from '@/modules/jobs/domain/value-objects/NflSeasonType'

export class SyncWeekEventsService {
  constructor(
    private readonly gameRepo: IGameRepository,
    private readonly teamRepo: ITeamRepository
  ) {}

  async sync(year: number, seasonType: number, week: number) {
    const providerWeek = toNflProviderWeek(seasonType as NflSeasonType, week)
    const raw = await fetchWeekEvents(year, seasonType, providerWeek)
    if (!raw || !raw.items) return []

    const createdOrUpdated = []

    for (const evt of raw.items) {
      const mapped = await mapEspnEventToGame(
        evt,
        year,
        seasonType,
        week,
        this.teamRepo
      )

      if (!mapped) continue

      const {
        espnCompetitionId,
        seasonYear,
        gameDate,
        homeTeamId,
        awayTeamId,
      } = mapped

      const data = {
          espnCompetitionId: evt.id,
          espnEventId: evt.id,      // REQUIRED
          seasonYear: String(year),
          seasonType,
          gameWeek: week,
          gameDate,
          homeTeamId,
          awayTeamId,
          homeScore: evt.homeScore ?? null,   // REQUIRED
          awayScore: evt.awayScore ?? null,   // REQUIRED
        gameStatus: 'scheduled',
      }

      const row = await this.gameRepo.upsertByKey(
        { espnCompetitionId },
        data
      )

      createdOrUpdated.push(row)
    }

    return createdOrUpdated
  }
}
