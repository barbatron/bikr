export const roundTo = (num: number, places: number) =>
  Math.round(num * 10 ** places) / 10 ** places;
