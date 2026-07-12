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

export const getWeeksForSeasonType = (seasonType: NflSeasonType): readonly number[] => {
  if (seasonType === NflSeasonType.Preseason) {
    return [1, 2, 3, 4];
  }

  if (seasonType === NflSeasonType.Postseason) {
    return [1, 2, 3, 4, 5];
  }

  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
};
