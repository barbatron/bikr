/// <reference types="npm:@types/google.maps" />
/// <reference types="npm:@googlemaps/js-api-loader" />

import { Observable } from "rxjs";

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

export type Movement<TDirection = AngleDegrees> =
  & DistanceMeters
  & Heading<TDirection>;

export type TurnOptions = Array<AngleDegrees>;

export declare namespace bikr {
  // 2D world presence: lat/long, heading (degrees)
  export type GeoPosition = google.maps.LatLngLiteral;
  export type GeoDirection = AngleDegrees;

  export interface Presence<
    TCoords = GeoPosition,
    TDirection = GeoDirection,
  > {
    position: TCoords;
    direction: TDirection;
  }

  export type GeoPresence = Presence<GeoPosition, GeoDirection>;

  export interface MovementMiddleware<TPresence = GeoPresence> {
    (presence: TPresence, movement: Movement): Promise<GeoPresence>;
  }

  export interface World<
    TCoords,
    TDirection,
    TPresence = Presence<TCoords, TDirection>,
  > {
    getMiddleware(): MovementMiddleware<TPresence>;
    handleMovement: (presence: TPresence, speed: Speed) => Promise<TPresence>;
  }

  export type Speed = { mps: number };
  export interface ModeOfTransport {
    speed: Observable<{ speed: Speed }>;
  }
}

// export const markerLibrary = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

// import { google } from "npm:@types/google.maps@3.58.1";

// import apiLoader from "@googlemaps/js-api-loader";

// export async function loadGoogleMaps(): Promise<Pick<google, "maps" | "marker" | "streetView">> {
//   const loader = new apiLoader.Loader({
//     apiKey: Deno.env.get("GOOGLE_MAP_API_KEY")!,
//     version: "weekly",
//   });
//   const [maps, marker, streetView] = await Promise.all([
//     loader.importLibrary("maps"),
//     loader.importLibrary("marker"),
//     loader.importLibrary("streetView")
//   ]);
//   return { maps, marker, streetView };
// }
