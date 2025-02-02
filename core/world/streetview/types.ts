import { AngleDegrees, LatLong, Presence } from "../../types.ts";
import { StreetViewLinkWithHeading } from "./streetview-utils.ts";

export type RoutePresence =
  | (
    & Pick<
      Presence<
        LatLong,
        AngleDegrees
      >,
      "position" | "heading"
    >
    & {
      routePoint: RoutePoint<google.maps.LatLngLiteral>;
      routePointIndex: number;
    }
  )
  | undefined;

export type GoogleStreetViewPresenceWorldData = {
  pano?: string;
  links?: StreetViewLinkWithHeading[];
  routePresence: RoutePresence;
};

export type GoogleStreetViewPresence = Presence<
  LatLong,
  AngleDegrees,
  GoogleStreetViewPresenceWorldData
>;

export interface RouteLike<TPos, THeading> {
  getInitialPresence(): { position: TPos; heading: THeading };
  queryPresence(
    totalDistance: number,
  ): RoutePresence | undefined;
}

export type GoogleLatLngAny = google.maps.LatLng | google.maps.LatLngLiteral;
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

export type Junction<TPos> = {
  position: TPos;
  startDistance: number;
  stepLength: number;

  directionIn?: { relative: number; absolute: number };

  nextPosition: TPos;
  directionOut?: { relative: number; absolute: number };

  maneuver?: string;
  htmlInstructions?: string;

  path: TPos[];
};

export type QueryJunctionResult<TPos> = {
  currentDeviation: number;
  prevJunction: Junction<TPos>;
  nextJunction?: Junction<TPos>;
  distanceToNext: number;
  isNearNext: boolean;
};

export type JunctionContext = {
  position: google.maps.LatLngLiteral;
  distanceToNext: number;
  directionFromCurrent: number;
  prevJunction: Junction<google.maps.LatLngLiteral>;
  nextJunction?: Junction<google.maps.LatLngLiteral>;
};
