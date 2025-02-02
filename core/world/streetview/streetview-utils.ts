import { LatLong, RoutePoint } from "../../types.ts";
import { diffHeading } from "../../utils.ts";
import { GoogleLatLngAny } from "./types.ts";

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
  return "toJSON" in latLng ? latLng.toJSON() : latLng;
}

export type StreetViewLinkResolver = {
  (
    position: LatLong | google.maps.LatLngLiteral,
  ): Promise<StreetViewLinkWithHeading[]>;
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

type PathPoint = {
  position: google.maps.LatLng;
  step: google.maps.DirectionsStep;
  stepPathIndex: number;
};

const pathPointToRoutePoint = () => {
  const totalDistanceAccumulator = { totalDistance: 0 };
  return (
    pathPoint: PathPoint,
    i: number,
    pathPoints: PathPoint[],
  ): RoutePoint<google.maps.LatLngLiteral> => {
    const { position, step, stepPathIndex } = pathPoint;
    const prevPathPoint = i > 0 ? pathPoints[i - 1].position : undefined;
    const nextPathPoint = pathPoints[i + 1]?.position;
    const headingInRel = prevPathPoint
      ? google.maps.geometry.spherical.computeHeading(prevPathPoint, position)
      : undefined;
    const headingOutRel = nextPathPoint
      ? google.maps.geometry.spherical.computeHeading(position, nextPathPoint)
      : undefined;
    const junctionInfo = stepPathIndex === 0
      ? { maneuver: step.maneuver, htmlInstructions: step.instructions }
      : undefined;
    const distanceToNext = nextPathPoint
      ? google.maps.geometry.spherical.computeDistanceBetween(
        position,
        nextPathPoint,
      )
      : undefined;
    const routePoint: RoutePoint<google.maps.LatLngLiteral> = {
      position: toGoogleLatLongLiteral(position),
      totalDistance: totalDistanceAccumulator.totalDistance,
      distanceToNext,
      headingIn: headingInRel
        ? {
          relative: headingInRel,
          absolute: headingInRel > 0 ? headingInRel : headingInRel + 360,
        }
        : undefined,
      headingOut: headingOutRel
        ? {
          relative: headingOutRel,
          absolute: headingOutRel > 0 ? headingOutRel : headingOutRel + 360,
        }
        : undefined,
      junctionInfo,
    };
    totalDistanceAccumulator.totalDistance += distanceToNext ?? 0;
    return routePoint;
  };
};

export function gmRouteToRoutePoints(
  route: google.maps.DirectionsRoute,
): RoutePoint<google.maps.LatLngLiteral>[] {
  const allPathPoints = route.legs.flatMap((leg) =>
    leg.steps.flatMap((step) =>
      // Skip last path point, as it's the same as the next step's first point
      step.path.slice(0, -1).map((p, i) => {
        return { position: p, step, stepPathIndex: i };
      })
    )
  );
  const routePoints = allPathPoints.map(pathPointToRoutePoint());
  console.log(
    `[gmrt:gmRouteToRoutePoints] RoutePoints`,
    routePoints,
  );

  return routePoints;
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

// export function gmRouteFromJson(
//   json: string,
// ) {
//   const obj = JSON.parse(json);
//   const routes = obj.routes.map((r: any) => ({
//     ...r,
//     bounds: new google.maps.LatLngBounds(
//       r.bounds.southwest,
//       r.bounds.northeast,
//     ),
//     legs: r.legs.map((l: google.maps.DirectionsLeg) => ({
//       ...l,
//       start_location: new google.maps.LatLng(l.start_location),
//       end_location: new google.maps.LatLng(l.end_location),
//       steps: l.steps.map((s: google.maps.DirectionsStep) => ({
//         ...s,
//         start_location: new google.maps.LatLng(s.start_location),
//         end_location: new google.maps.LatLng(s.end_location),
//       })),
//     })),
//   }));
//   return {
//     ...obj,
//     routes,
//   };
// }
