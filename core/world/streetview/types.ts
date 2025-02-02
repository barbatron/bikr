import {
  AngleDegrees,
  JunctionInfo,
  Presence,
  RoutePresence,
} from "../../types.ts";
import { StreetViewLinkWithHeading } from "./streetview-utils.ts";

export type GoogleStreetViewPresenceWorldData = {
  pano?: string;
  links?: StreetViewLinkWithHeading[];
  routePresence: RoutePresence<google.maps.LatLngLiteral, AngleDegrees>;
  junctionInfo: JunctionInfo | undefined;
};

export type GoogleStreetViewPresence = Presence<
  google.maps.LatLngLiteral,
  AngleDegrees,
  GoogleStreetViewPresenceWorldData
>;

export type GoogleLatLngAny = google.maps.LatLng | google.maps.LatLngLiteral;
