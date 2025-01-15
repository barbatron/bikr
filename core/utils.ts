import { LatLong } from "./types.ts";

export const roundTo = (num: number, places: number) =>
  Math.round(num * 10 ** places) / 10 ** places;

export const roundPosition = (
  [lat, lng]: LatLong,
) => [roundTo(lat, 6), roundTo(lng, 6)];
