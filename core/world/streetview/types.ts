import {
  AngleDegrees,
  JunctionInfo,
  LatLong,
  Presence,
  RoutePresence,
} from "../../types.ts";
import { StreetViewLinkWithHeading } from "./streetview-utils.ts";

export type GoogleStreetViewPresenceWorldData = {
  pano?: string;
  links?: StreetViewLinkWithHeading[];
  routePresence: RoutePresence<LatLong, AngleDegrees>;
  junctionInfo: JunctionInfo | undefined;
};

export type GoogleStreetViewPresence = Presence<
  LatLong,
  AngleDegrees,
  GoogleStreetViewPresenceWorldData
>;

export type GoogleLatLngAny = google.maps.LatLng | google.maps.LatLngLiteral;
