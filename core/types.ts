/// <reference types="npm:@types/google.maps" />
/// <reference types="npm:@googlemaps/js-api-loader" />
// World position, heading, etc
export type LatLong = [number, number];
export type AngleDegrees = { degrees: number };
export type DistanceMeters = { meters: number };

export type Heading<T = AngleDegrees> = { heading: T };
export type Position<T = LatLong> = { position: T };

export type Presence<
  TCoords = LatLong,
  TDirection = AngleDegrees,
> = Position<TCoords> & Heading<TDirection>;

export type Movement = DistanceMeters & Heading;
