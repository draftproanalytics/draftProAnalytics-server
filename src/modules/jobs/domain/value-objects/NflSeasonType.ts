export const NflSeasonType = {
  Preseason: 1,
  RegularSeason: 2,
  Postseason: 3,
} as const;

export type NflSeasonType = (typeof NflSeasonType)[keyof typeof NflSeasonType];

export const isNflSeasonType = (value: number): value is NflSeasonType =>
  value === NflSeasonType.Preseason ||
  value === NflSeasonType.RegularSeason ||
  value === NflSeasonType.Postseason;

/**
 * Returns the ESPN source-week buckets that must be queried for a full season load.
 * ESPN numbers preseason as 1=Hall of Fame, 2=Preseason Week 1, ... 4=Preseason Week 3.
 */
export const getWeeksForSeasonType = (seasonType: NflSeasonType): readonly number[] => {
  if (seasonType === NflSeasonType.Preseason) {
    return [1, 2, 3, 4];
  }

  if (seasonType === NflSeasonType.Postseason) {
    return [1, 2, 3, 4, 5];
  }

  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
};


/** Normalize ESPN's preseason source week to DPA/NFL-facing week numbering. */
export const normalizeNflWeekForPersistence = (
  seasonType: NflSeasonType,
  sourceWeek: number,
): number => {
  if (seasonType === NflSeasonType.Preseason) {
    return Math.max(0, sourceWeek - 1);
  }

  return sourceWeek;
};

/** Convert a DPA/NFL-facing week back to the ESPN source week for targeted refreshes. */
export const toNflProviderWeek = (seasonType: NflSeasonType, dpaWeek: number): number => {
  if (seasonType === NflSeasonType.Preseason) {
    return dpaWeek + 1;
  }

  return dpaWeek;
};
