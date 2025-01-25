import { AngleDegrees, LatLong, Presence } from "../../types.ts";

export type GoogleStreetViewPresenceWorldData = { pano: string };
export type GoogleStreetViewPresence = Presence<
  LatLong,
  AngleDegrees,
  GoogleStreetViewPresenceWorldData
>;

export interface RouteLike<TPos, THeading> {
  getInitialPresence(): { position: TPos; heading: THeading };
  queryJunction(positionLatLong: LatLong): QueryJunctionResult | undefined;
}

export type StepWithTotalDistance = {
  step: google.maps.DirectionsStep;
  totalDistance: number;
};

export type QueryJunctionResult = {
  query: {
    position: google.maps.LatLngLiteral;
    deviation: number;
  };
  junction: {
    position: google.maps.LatLngLiteral;
    distance: number;
    turnDirection: number;
    maneuver?: string;
    htmlInstructions: string;
  };
  prevStep: google.maps.DirectionsStep;
  nextStep: google.maps.DirectionsStep;
};
