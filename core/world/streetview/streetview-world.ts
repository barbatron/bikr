import { BehaviorSubject, bufferTime, filter, map, Observable } from "rxjs";
import { AngleDegrees, Movement, World } from "../../types.ts";
import {
  findClosestDirection,
  StreetViewLinkResolver,
  toGoogleLatLongLiteral,
  toLatLong,
} from "./streetview-utils.ts";
import {
  GoogleLatLngAny,
  GoogleStreetViewPresence,
  RouteLike,
} from "./types.ts";

export type StreetViewWorldParams = {
  route: RouteLike<GoogleLatLngAny, AngleDegrees>;
  linkResolver?: StreetViewLinkResolver;
};

export class StreetViewWorld implements World<GoogleStreetViewPresence> {
  private readonly presenceSource: BehaviorSubject<GoogleStreetViewPresence>;
  private readonly linkResolver?: StreetViewLinkResolver;
  private readonly route: RouteLike<GoogleLatLngAny, AngleDegrees>;

  public constructor({ route, linkResolver }: StreetViewWorldParams) {
    this.route = route;
    this.linkResolver = linkResolver;
    const { position, heading } = route.getInitialPresence();
    const posAsLatLng = toGoogleLatLongLiteral(position);
    this.presenceSource = new BehaviorSubject<GoogleStreetViewPresence>(
      {
        position: [posAsLatLng.lat, posAsLatLng.lng],
        heading,
        world: { pano: "" },
      },
    );
  }

  createPresence() {
    const initialPresence = this.route.getInitialPresence();
    console.log("[sv] initialPresence", initialPresence);
    const initialLatLong = toLatLong(initialPresence.position);
    if (this.linkResolver) {
      this.linkResolver(initialLatLong).then((links) => {
        const closestDirectionResult = findClosestDirection(
          initialPresence.heading.degrees,
          links,
        );
        console.log("[sv] initialPresence corrected from sv links", {
          closestDirectionResult,
          initialHeading: initialPresence.heading.degrees,
          newHeading: closestDirectionResult.link.heading,
        });
        this.presenceSource.next({
          position: initialLatLong,
          heading: { degrees: closestDirectionResult.link.heading },
          world: { pano: closestDirectionResult.link.pano! },
        });
      });
    }
    return this.presenceSource.asObservable();
  }

  consume(movements: Observable<Movement>) {
    movements
      .pipe(
        // Buffer & sum up movements to prevent spamming map api
        // Should ideally be synchronized with the street view panorama updates?
        bufferTime(1000),
        map((movements) => ({
          meters: movements.reduce((acc, curr) => acc + curr.meters, 0),
        })),
        filter((m) => m.meters > 0),
      )
      .subscribe((movement) => this.handleMovement(movement));
  }

  private handleMovement(movement: Movement) {
    const presence = this.presenceSource.value; // Hacky

    console.log("[sv] handleMovement", { presence, movement });

    // Check if close to a route nav point
    const junctionResult = this.route.queryJunction(presence.position);
    if (junctionResult) {
      console.log("[sv] junctionResult", junctionResult);
    }

    // If we're near a junction, consider whether movement takes us past it or not
    if (junctionResult?.isNearNext) {
      if (junctionResult.distanceToNext < movement.meters) {
        // Will move past end of current step
        const movementPastJunction = movement.meters -
          junctionResult.distanceToNext;
        console.log("[sv]   moving past junction", {
          movementPastJunction,
          distanceToUpcomingJunction: junctionResult.distanceToNext,
        });
        const { nextJunction } = junctionResult;

        // If no next junction, we reach the end of the route
        if (!nextJunction) {
          console.log("[sv]   Reached end of route");
          const newPosition = toLatLong(
            junctionResult.prevJunction.nextPosition,
          );
          this.presenceSource.next({
            position: newPosition,
            heading: { degrees: presence.heading.degrees },
            world: { pano: "" },
          });
          return;
        }

        // Find position from upcoming junction, after having moved past it
        const newDirection = nextJunction?.directionOut ??
          presence.heading.degrees; // TODO: Correct based on links
        const newPosition = google.maps.geometry.spherical.computeOffset(
          new google.maps.LatLng(toGoogleLatLongLiteral(nextJunction.position)),
          movementPastJunction,
          newDirection,
        );
        this.presenceSource.next({
          position: [newPosition.lat(), newPosition.lng()],
          heading: { degrees: newDirection },
          world: { pano: "" },
        });
        return;
      }

      // Will not move past junction - fall through to keep moving towards it using current heading
    }

    // If we're NOT close to a route nav point, move along in current direction
    console.log("[sv] Moving towards junction", { junctionResult });
    const newPosition = google.maps.geometry.spherical.computeOffset(
      new google.maps.LatLng(toGoogleLatLongLiteral(presence.position)),
      movement.meters,
      presence.heading.degrees,
    );
    // TODO: Correct heading based on links
    this.presenceSource.next({
      position: toLatLong(newPosition),
      heading: { degrees: presence.heading.degrees },
      world: { pano: "" },
    });
  }
}
