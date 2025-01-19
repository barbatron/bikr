/// <reference types="npm:@types/google.maps" />
/// <reference types="npm:@googlemaps/js-api-loader" />
// World position, heading, etc
export type LatLong = [number, number];
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

export type StreetViewLinkWithHeading = google.maps.StreetViewLink & {
  heading: number;
};

export type NewHeadingResult = {
  minDiff: number;
  link: StreetViewLinkWithHeading;
} | null;
