/// <reference types="npm:@types/google.maps" />

import { Observable } from "npm:rxjs";

// World position, heading, etc
export type LatLong = [number, number, ...unknown[]]; // TODO: fix so [1,3] satisfies without cast/annotation
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

export type Movement = { relative: DistanceMeters; total: DistanceMeters };

export type MovementRequest = Movement;

export type MovementResult = {
  movementActual: Movement;
  presence: Presence;
} | null;

export interface World<TPresence extends Presence> {
  createPresence: () => Observable<TPresence>;
  consume(movements: Observable<Movement>): void;
}

export type RoutePresence<TPos, THeading> =
  & Pick<
    Presence<
      TPos,
      THeading
    >,
    "position" | "heading"
  >
  & {
    routePoint: RoutePoint<TPos>;
    nextRoutePoint: RoutePoint<TPos> | undefined;
    routePointIndex: number;
  };

export interface RouteLike<TPos, THeading> {
  getInitialPresence(): { position: TPos; heading: THeading };
  queryPresence(
    totalDistance: number,
  ): RoutePresence<TPos, THeading> | undefined;
}
export type RelAbs = { relative: number; absolute: number };

export type JunctionInfo = {
  maneuver?: string;
  htmlInstructions?: string;
};

export type RoutePoint<TPos> = {
  totalDistance: number;
  position: TPos;
  headingIn: RelAbs | undefined;
  headingOut: RelAbs | undefined;
  distanceToNext: number | undefined;
  junctionInfo: JunctionInfo | undefined;
};
