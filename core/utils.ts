import { LatLong } from "./types.ts";

export const roundTo = (num: number, places: number) =>
  Math.round(num * 10 ** places) / 10 ** places;

export const roundPosition = (
  [lat, lng]: LatLong,
) => [roundTo(lat, 6), roundTo(lng, 6)];

export const diffHeading = (heading1: number, heading2: number): number =>
  Math.abs(heading1 - heading2) % 360;

export const isLatLong = (x: unknown): x is LatLong =>
  x instanceof Array &&
  x.length >= 2 &&
  typeof x[0] === "number" && typeof x[1] === "number";
