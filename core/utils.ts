import { LatLong, Presence } from "./types.ts";

export const roundTo = (num: number, places: number) =>
  Math.round(num * 10 ** places) / 10 ** places;

export const roundPosition = (
  [lat, lng]: LatLong,
) => [roundTo(lat, 6), roundTo(lng, 6)];

export const presenceComparator = (prev: Presence, curr: Presence) =>
  prev.position[0] === curr.position[0] &&
  prev.position[1] === curr.position[1] &&
  prev.heading.degrees === curr.heading.degrees;
