import { AngleDegrees, LatLong, Presence } from "../../types.ts";
import { StreetViewLinkWithHeading } from "./streetview-utils.ts";

export type JunctionInfo<TPos> = {
  junction: Junction<TPos>;
  distanceFromCurrent: number;
};

export type GoogleStreetViewPresenceWorldData = {
  pano?: string;
  links?: StreetViewLinkWithHeading[];
  prevJunction: JunctionInfo<GoogleLatLngAny>;
  nextJunction?: JunctionInfo<GoogleLatLngAny>;
};
export type GoogleStreetViewPresence = Presence<
  LatLong,
  AngleDegrees,
  GoogleStreetViewPresenceWorldData
>;

export interface RouteLike<TPos, THeading> {
  getInitialPresence(): { position: TPos; heading: THeading };
  queryJunction(
    positionLatLong: TPos,
  ): QueryJunctionResult<TPos> | undefined;
}

export type GoogleLatLngAny = google.maps.LatLng | google.maps.LatLngLiteral;

export type Junction<TPos> = {
  position: TPos;
  startDistance: number;
  stepLength: number;
  nextPosition: TPos;
  directionOut?: number;
  maneuver?: string;
  htmlInstructions?: string;
};

export type QueryJunctionResult<TPos> = {
  currentDeviation: number;
  prevJunction: Junction<TPos>;
  nextJunction?: Junction<TPos>;
  distanceToNext: number;
  isNearNext: boolean;
};
