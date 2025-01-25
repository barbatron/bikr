/// <reference types="npm:@types/google.maps" />

import { Observable } from "npm:rxjs";

// World position, heading, etc
export type LatLong = [number, number]; // TODO: fix so [1,3] satisfies without cast/annotation
export type AngleDegrees = { degrees: number };
export type DistanceMeters = { meters: number };

export type Heading<T = AngleDegrees> = { heading: T };
export type Position<T = LatLong> = { position: T };

const emptyObj = {};
type Empty = typeof emptyObj;

export type Presence<
  TCoords = LatLong,
  TDirection = AngleDegrees,
  TWorldSpecific = Empty,
> = {
  position: TCoords;
  heading: TDirection;
} & (TWorldSpecific extends never ? Empty : { world: TWorldSpecific });

export type Movement = DistanceMeters; // & Heading;

export type MovementRequest = Movement;

export type MovementResult = {
  movementActual: Movement;
  presence: Presence;
} | null;

export interface World<TPresence extends Presence> {
  createPresence: () => Observable<TPresence>;
  consume(movements: Observable<Movement>): void;
}
