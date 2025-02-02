import { AngleDegrees } from "../../types.ts";
import { toGoogleLatLongLiteral, toLatLong } from "./streetview-utils.ts";
import {
  GoogleStreetViewPresence,
  RouteLike,
  RoutePoint,
  RoutePresence,
} from "./types.ts";

export class GoogleMapsRouteTracker
  implements RouteLike<google.maps.LatLngLiteral, AngleDegrees> {
  private lastMatchIndex = 0;

  public constructor(
    public readonly routePoints: ReadonlyArray<
      RoutePoint<google.maps.LatLngLiteral>
    >,
  ) {
    if (!routePoints.length) throw Error("Empty junctions array");
  }

  getInitialPresence() {
    const [first] = this.routePoints;
    return {
      position: toGoogleLatLongLiteral(first.position),
      heading: { degrees: first.headingOut!.absolute },
    };
  }

  queryPresence(
    totalDistance: number,
  ): RoutePresence | undefined {
    // Find route point that started before the given totalDistance and ends after it
    const routePoints = this.routePoints.filter(
      (rp) =>
        rp.totalDistance <= totalDistance &&
        (rp.totalDistance + (rp.distanceToNext ?? 0)) >= totalDistance,
    );
    if (routePoints.length === 0) {
      console.error(
        "[gmrt:queryPresence] No route points found for totalDistance",
        totalDistance,
      );
      return;
    }
    if (routePoints.length > 1) {
      console.warn(
        "[gmrt:queryPresence] Multiple route points found for totalDistance",
        totalDistance,
        routePoints,
      );
    }
    const [routePoint] = routePoints;
    const interpolatedPoisition = google.maps.geometry.spherical.computeOffset(
      routePoint.position,
      totalDistance - routePoint.totalDistance,
      routePoint.headingOut!.absolute,
    );
    return {
      position: toLatLong(interpolatedPoisition),
      heading: { degrees: routePoint.headingOut!.absolute },
      routePoint,
      routePointIndex: this.routePoints.indexOf(routePoint),
    };
  }

  /**
   * Returns the distance in meters between the current position and the straight line connecting the start and end points.
   */
  private calculateDeviation(
    position: google.maps.LatLngLiteral,
    startPoint: google.maps.LatLng,
    endPoint: google.maps.LatLng,
  ) {
    const positionPoint = new google.maps.LatLng(position);

    // Calculate bearing between start and end points
    const bearing = google.maps.geometry.spherical.computeHeading(
      startPoint,
      endPoint,
    );
    // Calculate bearing from start to position
    const positionBearing = google.maps.geometry.spherical.computeHeading(
      startPoint,
      positionPoint,
    );
    // Calculate distance from start to position
    const startToPositionDistance = google.maps.geometry.spherical
      .computeDistanceBetween(startPoint, positionPoint);

    // Calculate perpendicular distance using trigonometry
    const deviation = Math.abs(
      startToPositionDistance *
        Math.sin((positionBearing - bearing) * Math.PI / 180),
    );

    return deviation;
  }
}
