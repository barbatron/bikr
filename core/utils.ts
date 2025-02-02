import { bufferTime, filter, map, Observable, OperatorFunction } from "rxjs";
import { LatLong, Movement } from "./types.ts";

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

//
// RxJS utils
//
export const aggregateMovements = (movements: Movement[]): Movement => ({
  // Relative movement is the sum of all movements in the buffer
  relative: {
    meters: movements.reduce(
      (acc, curr) => acc + curr.relative.meters,
      0,
    ),
  },
  // Total movement from last entry in the buffer
  total: movements[movements.length - 1]?.total ?? 0,
});

export const movementAggregator = (): OperatorFunction<Movement[], Movement> =>
  map(aggregateMovements);

export const bufferMovements =
  (duration: number) => (movements: Observable<Movement>) =>
    movements.pipe(
      // Buffer & sum up movements to prevent spamming map api
      // Should ideally be synchronized with the street view panorama updates?
      bufferTime(duration),
      movementAggregator(),
      filter((m) => m.relative.meters > 0),
    );
