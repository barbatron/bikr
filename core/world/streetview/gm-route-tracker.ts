import { AngleDegrees, LatLong } from "../../types.ts";
import { toGoogleLatLongLiteral, traverseSteps } from "./streetview-utils.ts";
import { QueryJunctionResult, RouteLike } from "./types.ts";

export class GoogleMapsRouteTracker
  implements RouteLike<LatLong, AngleDegrees> {
  private lastMatchIndex = 0;
  private readonly steps: google.maps.DirectionsStep[];

  public constructor(public readonly route: google.maps.DirectionsRoute) {
    this.steps = Array.from(traverseSteps(route));
  }

  getInitialPresence() {
    const steps = traverseSteps(this.route);
    if (steps.length < 2) throw Error("Route has less than 2 steps");
    const startLoc = toGoogleLatLongLiteral(steps[0].start_location);
    const initialDirection = google.maps.geometry.spherical.computeHeading(
      startLoc,
      steps[1].start_location,
    );
    return {
      position: [startLoc.lat, startLoc.lng] satisfies LatLong,
      heading: { degrees: initialDirection },
    };
  }

  remainingSteps() {
    return this.steps.slice(this.lastMatchIndex);
  }

  queryJunction(positionLatLong: LatLong): QueryJunctionResult | undefined {
    if (!this.steps.length) {
      console.warn("[gmrt] No steps to query junctions");
      return;
    }
    const position = toGoogleLatLongLiteral(positionLatLong);

    // If current step distance is very small, use half of that as radius, otherwise 20 meters:
    const radiusMeters = Math.min(
      this.steps[this.lastMatchIndex].distance?.value ?? Infinity,
      20,
    );

    if (this.lastMatchIndex >= this.steps.length) {
      console.warn(
        "[gmrt] No remaining steps to query junctions - route completed, STOP BIKING!",
      );
      return;
    }

    const remainingSteps = this.remainingSteps();
    const currentStep = remainingSteps[0];
    const deviation = this.calculateDeviation(
      position,
      currentStep.start_location,
      currentStep.end_location,
    );

    console.log("[gmrt] Query junction", {
      position,
      radiusMeters,
      currentStep: {
        start: toGoogleLatLongLiteral(currentStep?.start_location),
        end: toGoogleLatLongLiteral(currentStep?.end_location),
        length: currentStep?.distance?.value,
        deviation,
      },
      remainingCount: remainingSteps.length,
      lastMatchIndex: this.lastMatchIndex,
    });

    const junction = remainingSteps.find((step, i) => {
      const stepEnd = step.end_location;
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(position),
        stepEnd,
      );
      const thisRad = Math.min(
        radiusMeters,
        step.distance?.value ?? radiusMeters,
      );
      if (distance < thisRad) {
        console.log("[gmrt] Found junction within radius", {
          i,
          globalIndex: i + this.lastMatchIndex,
          distance,
          radiusMeters,
          thisRad,
          step,
        });
        return true;
      }
    });

    if (junction) {
      const stepIndex = this.steps.indexOf(junction);
      const nextStep = this.steps[stepIndex + 1];
      if (!nextStep) {
        console.warn("[gmrt] No next step found, route complete!");
        return;
      }
      console.log("[gmrt] Next step", nextStep);
      // Calculate bearing from current junction to next step's end location:
      const direction = google.maps.geometry.spherical.computeHeading(
        junction.end_location,
        nextStep.end_location,
      );
      return {
        query: {
          position,
          deviation,
        },
        junction: {
          position: toGoogleLatLongLiteral(nextStep.start_location),
          distance: google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(position),
            nextStep.start_location,
          ),
          turnDirection: direction,
          maneuver: nextStep.maneuver,
          htmlInstructions: nextStep.instructions,
        },
        prevStep: junction,
        nextStep: nextStep,
      };
    }
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
