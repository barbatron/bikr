import { BehaviorSubject, bufferTime, filter, map, Observable } from "rxjs";
import { LatLong, Movement, World } from "../../types.ts";
import { GoogleMapsRouteTracker } from "./gm-route-tracker.ts";
import {
  findClosestDirection,
  StreetViewLinkResolver,
  toGoogleLatLongLiteral,
  toLatLong,
} from "./streetview-utils.ts";
import {
  GoogleLatLngAny,
  GoogleStreetViewPresence,
  GoogleStreetViewPresenceWorldData,
  Junction,
  JunctionInfo,
} from "./types.ts";

export type StreetViewWorldParams = {
  route: GoogleMapsRouteTracker;
  linkResolver?: StreetViewLinkResolver;
};

function toJunctionInfo(
  position: LatLong,
  junction: Junction<GoogleLatLngAny>,
): JunctionInfo<GoogleLatLngAny> {
  const posLatLng = new google.maps.LatLng(toGoogleLatLongLiteral(position));
  return {
    junction,
    distanceFromCurrent: google.maps.geometry.spherical.computeDistanceBetween(
      posLatLng,
      new google.maps.LatLng(toGoogleLatLongLiteral(junction.position)),
    ),
  };
}

export class StreetViewWorld implements World<GoogleStreetViewPresence> {
  private readonly presenceSource: BehaviorSubject<GoogleStreetViewPresence>;
  private readonly linkResolver?: StreetViewLinkResolver;
  private readonly route: GoogleMapsRouteTracker;

  public constructor({ route, linkResolver }: StreetViewWorldParams) {
    this.route = route;
    this.linkResolver = linkResolver;
    const { position, heading } = route.getInitialPresence();
    const posAsLatLong = toLatLong(position);
    const junctionResult = route.queryJunction(position);
    if (!junctionResult) throw Error("No initial junction result");
    this.presenceSource = new BehaviorSubject<GoogleStreetViewPresence>(
      {
        position: posAsLatLong,
        heading,
        world: this.toWorldData(
          posAsLatLong,
          junctionResult.prevJunction,
          junctionResult.nextJunction,
        ),
      },
    );
  }

  toWorldData(
    position: LatLong,
    prevJunction: Junction<google.maps.LatLngLiteral>,
    nextJunction: Junction<google.maps.LatLngLiteral> | undefined,
  ): GoogleStreetViewPresenceWorldData {
    return {
      prevJunction: toJunctionInfo(
        position,
        prevJunction,
      ),
      nextJunction: nextJunction
        ? toJunctionInfo(position, nextJunction)
        : undefined,
    };
  }

  createPresence() {
    if (this.linkResolver) {
      this.updatePresence(
        this.presenceSource.value.position,
        this.presenceSource.value.heading.degrees,
        this.presenceSource.value.world,
      );
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

  private async updatePresence(
    newPosition: LatLong,
    direction: number,
    worldData: GoogleStreetViewPresenceWorldData,
  ) {
    const links = this.linkResolver ? await this.linkResolver(newPosition) : [];
    const closestDirection = links.length
      ? findClosestDirection(
        direction,
        links,
      ).link.heading
      : direction;
    const newPresence = {
      position: newPosition,
      heading: { degrees: closestDirection },
      world: worldData,
    };
    this.presenceSource.next(newPresence);
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
        this.route.bumpToNextJunction();

        // Will move past end of current step
        const movementPastJunction = movement.meters -
          junctionResult.distanceToNext;
        console.log("[sv]   Moving past junction", {
          movementPastJunction,
          distanceToUpcomingJunction: junctionResult.distanceToNext,
        });
        const { nextJunction } = junctionResult;

        // If no next junction, we reach the end of the route
        if (!nextJunction) {
          console.log(
            "[sv]   Reached end of route - locking to end of current step",
          );
          const newPosition = toLatLong(
            junctionResult.prevJunction.nextPosition,
          );
          return this.updatePresence(
            newPosition,
            presence.heading.degrees,
            this.toWorldData(
              newPosition,
              junctionResult.prevJunction,
              junctionResult.nextJunction,
            ),
          );
        }

        // Find position from upcoming junction, after having moved past it
        const newDirection = nextJunction?.directionOut ??
          presence.heading.degrees;
        const newPosition = toLatLong(
          google.maps.geometry.spherical.computeOffset(
            new google.maps.LatLng(
              toGoogleLatLongLiteral(nextJunction.position),
            ),
            movementPastJunction,
            newDirection,
          ),
        );
        return this.updatePresence(
          newPosition,
          presence.heading.degrees,
          this.toWorldData(
            newPosition,
            junctionResult.prevJunction,
            junctionResult.nextJunction,
          ),
        );
      }

      // Will not move past junction - fall through to keep moving towards it using current heading
    }

    // If we're NOT close to a route nav point, move along in current direction, correcting heading based on links
    console.log("[sv] Moving towards junction", { junctionResult });
    const newPositionLatLng = google.maps.geometry.spherical.computeOffset(
      new google.maps.LatLng(toGoogleLatLongLiteral(presence.position)),
      movement.meters,
      presence.heading.degrees,
    );
    const newPosition = toLatLong(newPositionLatLng);
    return this.updatePresence(
      newPosition,
      presence.heading.degrees,
      this.toWorldData(
        newPosition,
        junctionResult?.prevJunction ?? this.route.junctions[0],
        junctionResult?.nextJunction,
      ),
    );
  }
}
