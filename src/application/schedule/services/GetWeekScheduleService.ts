// ..server/src/application/schedule/services/GetWeekScheduleService.ts
import { EspnScheduleClient } from "@/infrastructure/espn/EspnScheduleClient";
import { WeekScheduleDTO } from "@/utils/schedule/scheduleTypes";

export class GetWeekScheduleService {
  constructor(private scheduleClient: EspnScheduleClient) {}

  async execute(
    year: number,
    seasonType: number,
    week: number | null
  ): Promise<WeekScheduleDTO> {
    if (seasonType === 1 && week === null) {
      return this.getAllPreseasonGames(year);
    }

    if (week === null) {
      throw new Error('Week is required for regular season and postseason');
    }

    if (seasonType === 1) {
      // Upcoming Games uses DPA-facing numbering (0=HOF, 1..3=preseason weeks).
      // ESPN uses source buckets 1=HOF, 2..4=preseason weeks.
      const result = await this.scheduleClient.getWeekEvents(year, seasonType, week + 1);
      return { ...result, week };
    }

    return this.scheduleClient.getWeekEvents(year, seasonType, week);
  }

  private async getAllPreseasonGames(year: number): Promise<WeekScheduleDTO> {
    const preseasonWeeks = [1, 2, 3, 4];
    const results = await Promise.allSettled(
      preseasonWeeks.map((week) => this.scheduleClient.getWeekEvents(year, 1, week))
    );

    const eventsById = new Map<number, WeekScheduleDTO['events'][number]>();

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;

      for (const event of result.value.events) {
        eventsById.set(event.id, event);
      }
    }

    const events = [...eventsById.values()].sort((left, right) => {
      const leftTime = left.date ? Date.parse(left.date) : Number.MAX_SAFE_INTEGER;
      const rightTime = right.date ? Date.parse(right.date) : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    });

    return {
      year,
      seasonType: 1,
      week: 0,
      events,
    };
  }
}
