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

export type TurnOptions = Array<AngleDegrees>;

export { google } from "npm:@types/google.maps@^3.58.1";
