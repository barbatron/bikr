import { AngleDegrees, LatLong } from "../../types.ts";
import { toGoogleLatLongLiteral } from "./streetview-utils.ts";
import {
  GoogleLatLngAny,
  Junction,
  QueryJunctionResult,
  RouteLike,
} from "./types.ts";

export class GoogleMapsRouteTracker
  implements RouteLike<google.maps.LatLngLiteral, AngleDegrees> {
  private lastMatchIndex = 0;

  public constructor(
    public readonly junctions: ReadonlyArray<
      Junction<google.maps.LatLngLiteral>
    >,
  ) {
    if (!junctions.length) throw Error("Empty junctions array");
  }

  getInitialPresence() {
    const [firstJunction] = this.junctions;
    return {
      position: toGoogleLatLongLiteral(firstJunction.position),
      heading: { degrees: firstJunction.directionOut! },
    };
  }

  junctionContextFromTotalDistance(totalDistance: number) {
    const prevJunction = this.junctions.find((j) =>
      totalDistance >= j.startDistance &&
      totalDistance < (j.startDistance + j.stepLength)
    );
    if (!prevJunction) {
      console.warn(
        "[gmrt] No junction found for total distance - end of route",
        totalDistance,
      );
      // TODO: Stream complete
      return;
    }
    const distanceToNext = prevJunction.startDistance +
      prevJunction.stepLength - totalDistance;
    const stepFraction = distanceToNext / prevJunction.stepLength;
    const position = google.maps.geometry.spherical.interpolate(
      prevJunction.position,
      prevJunction.nextPosition,
      stepFraction,
    );
    const directionFromCurrent = google.maps.geometry.spherical.computeHeading(
      position,
      prevJunction.nextPosition,
    );
    const prevJunctionIndex = this.junctions.indexOf(prevJunction);
    const nextJunction = prevJunctionIndex > -1
      ? this.junctions[prevJunctionIndex + 1]
      : undefined;
    const junctionContext = {
      position: toGoogleLatLongLiteral(position),
      distanceToNext,
      directionFromCurrent,
      prevJunction,
      nextJunction,
    };
    console.log("[gmrt] Junction context from total distance", junctionContext);
    return junctionContext;
  }

  queryJunction(
    positionLatLong: GoogleLatLngAny | LatLong,
  ): QueryJunctionResult<google.maps.LatLngLiteral> | undefined {
    const position = toGoogleLatLongLiteral(positionLatLong);
    if (this.lastMatchIndex >= this.junctions.length - 1) {
      console.warn(
        "[gmrt] No remaining junctions to query - route completed, STOP BIKING!",
      );
      return;
    }

    const prevJunction = this.junctions[this.lastMatchIndex];
    const currentDeviation = this.calculateDeviation(
      position,
      new google.maps.LatLng(prevJunction.position),
      new google.maps.LatLng(prevJunction.nextPosition),
    );

    // If current step distance is very small, use half of that as radius, otherwise 20 meters:
    const proximityThreshold = Math.min(
      prevJunction.stepLength ?? Infinity,
      20,
    );
    const nextJunction = this.junctions[this.lastMatchIndex + 1];
    const distanceToNext = google.maps.geometry.spherical
      .computeDistanceBetween(
        position,
        new google.maps.LatLng(prevJunction.nextPosition),
      );
    const isNearNext = distanceToNext <= proximityThreshold;
    return {
      currentDeviation,
      distanceToNext,
      isNearNext,
      prevJunction,
      nextJunction,
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
