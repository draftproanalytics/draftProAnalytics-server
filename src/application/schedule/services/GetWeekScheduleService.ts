// ..server/src/application/schedule/services/GetWeekScheduleService.ts
import { EspnScheduleClient } from "@/infrastructure/espn/EspnScheduleClient";
import { WeekScheduleDTO } from "@/utils/schedule/scheduleTypes";

export class GetWeekScheduleService {
  constructor(private scheduleClient: EspnScheduleClient) {}

  async execute(
    year: number,
    seasonType: number,
    week: number
  ): Promise<WeekScheduleDTO> {
    if (seasonType === 1 && week === 0) {
      return this.getAllPreseasonGames(year);
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
