import { LatLong } from "../../types.ts";
import { diffHeading, isLatLong } from "../../utils.ts";
import { GoogleLatLngAny, Junction } from "./types.ts";

export type StreetViewLinkWithHeading = google.maps.StreetViewLink & {
  heading: number;
};

export type NewHeadingResult = {
  minDiff: number;
  link: StreetViewLinkWithHeading;
};

export const toValidLinks = (
  links:
    | (google.maps.StreetViewLink | StreetViewLinkWithHeading | null)[]
    | null,
): StreetViewLinkWithHeading[] =>
  (links ?? []).filter((l) => typeof l?.heading === "number").map(
    (l) => l as StreetViewLinkWithHeading,
  );

export function findClosestDirection<
  TLinks extends
    | (google.maps.StreetViewLink | StreetViewLinkWithHeading | null)[]
    | null,
>(
  currentDirection: number,
  links: TLinks,
): TLinks extends StreetViewLinkWithHeading[] ? NewHeadingResult
  : (NewHeadingResult | null) {
  const validLinks = toValidLinks(links);
  // @ts-ignore - if we DID get SVLWH[] then we DEFINITELY will have a result with a link
  return validLinks.reduce(
    (acc, link) => {
      const diff = diffHeading(currentDirection, link.heading);
      if (!acc || diff < acc.minDiff) {
        return { minDiff: diff, link };
      }
      return acc;
    },
    null as {
      minDiff: number;
      link: StreetViewLinkWithHeading;
    } | null,
  );
}

export function toGoogleLatLongLiteral(
  latLng: GoogleLatLngAny | LatLong,
): google.maps.LatLngLiteral {
  if (latLng instanceof Array) {
    // Is LatLong
    return { lat: latLng[0], lng: latLng[1] };
  }
  return latLng instanceof google.maps.LatLng ? latLng.toJSON() : latLng;
}

export function toLatLong(
  latLng: GoogleLatLngAny | LatLong,
): LatLong {
  if (isLatLong(latLng)) return latLng;
  if (latLng instanceof google.maps.LatLng) return [latLng.lat(), latLng.lng()];
  return [latLng.lat, latLng.lng];
}

export type StreetViewLinkResolver = {
  (position: LatLong): Promise<StreetViewLinkWithHeading[]>;
};

export function noLinksResolver(): Promise<StreetViewLinkWithHeading[]> {
  return Promise.resolve([]);
}

export const createMapsApiLinksResolver =
  (streetViewService: google.maps.StreetViewService): StreetViewLinkResolver =>
  (position) => {
    const latLng = toGoogleLatLongLiteral(position);
    return new Promise((res) => {
      streetViewService.getPanorama({
        location: latLng,
        preference: google.maps.StreetViewPreference.NEAREST,
      }, (data, status) => {
        if (status !== google.maps.StreetViewStatus.OK) {
          return [];
        }
        res(toValidLinks(data!.links!));
      });
    });
  };

export function gmRouteToJunctions(
  route: google.maps.DirectionsRoute,
): Junction<google.maps.LatLngLiteral>[] {
  const allSteps = route.legs.flatMap((leg) => leg.steps);
  let totalDistance = 0;
  const junctions: Junction<google.maps.LatLngLiteral>[] = [];
  for (let i = 0; i < allSteps.length; i++) {
    const step = allSteps[i];
    const stepLength = step.distance?.value ?? 0;
    if (!stepLength) {
      console.warn("[gmrt:gmRouteToJunctions] Zero step length", step);
    }
    const startDistance = (totalDistance += stepLength);
    let heading = google.maps.geometry.spherical.computeHeading(
      step.start_location,
      step.end_location,
    );
    if (heading < 0) heading += 360;
    junctions.push({
      position: toGoogleLatLongLiteral(step.start_location),
      nextPosition: toGoogleLatLongLiteral(step.end_location),
      startDistance,
      stepLength,
      directionOut: heading,
      maneuver: step.maneuver,
      htmlInstructions: step.instructions,
    });
  }
  return junctions;
}

export function gmRouteToJson(
  result: google.maps.DirectionsResult,
): string {
  const jsonResult = {
    ...result,
    routes: result.routes.map((r) => ({
      ...r,
      bounds: r.bounds?.toJSON(),
      legs: r.legs.map((l) => ({
        ...l,
        start_location: l.start_location.toJSON(),
        end_location: l.end_location.toJSON(),
        steps: l.steps.map((s) => ({
          ...s,
          start_location: s.start_location.toJSON(),
          end_location: s.end_location.toJSON(),
        })),
      })),
    })),
  };
  return JSON.stringify(jsonResult, null, 2);
}

export function gmRouteFromJson(
  json: string,
) {
  const obj = JSON.parse(json);
  const routes = obj.routes.map((r: any) => ({
    ...r,
    bounds: new google.maps.LatLngBounds(
      r.bounds.southwest,
      r.bounds.northeast,
    ),
    legs: r.legs.map((l: any) => ({
      ...l,
      start_location: new google.maps.LatLng(l.start_location),
      end_location: new google.maps.LatLng(l.end_location),
      steps: l.steps.map((s: any) => ({
        ...s,
        start_location: new google.maps.LatLng(s.start_location),
        end_location: new google.maps.LatLng(s.end_location),
      })),
    })),
  }));
  return {
    ...obj,
    routes,
  };
}
