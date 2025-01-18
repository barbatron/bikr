// @deno-types="npm:@types/google.maps"
import { computeDestinationPoint, getDistance } from "geolib";
import { streetViewLinks } from "../session-main.ts";
import { LatLong, Movement } from "../types.ts";
import { findClosestDirection } from "./streetview-utils.ts";
import { MovementRequest, MovementResult, World } from "./world.ts";

export class StreetViewWorld implements World {
  public constructor(
    public readonly sv: google.maps.StreetViewService,
    public readonly searchRadius = 50,
  ) {}

  // deno-lint-ignore require-await
  async handleMovement(
    movementRequest: MovementRequest,
  ): Promise<MovementResult> {
    const { presence, movement } = movementRequest;
    const currentLinks = streetViewLinks.value;
    console.log("[sv] handleMovement", { presence, movement, currentLinks });
    const headingDegrees = movementRequest.movement.heading.degrees;
    const [currentLat, currentLon] = presence.position;

    const createObeyingMovementResult = (): MovementResult => {
      const proposedPosition = computeDestinationPoint(
        { currentLat, currentLon },
        movement.meters,
        headingDegrees,
      );
      return {
        movementActual: movement,
        presence: {
          position: [proposedPosition.latitude, proposedPosition.longitude],
          heading: { degrees: headingDegrees },
        },
      };
    };

    const panoLinks = streetViewLinks.value; // data.links;
    const bestMatchLink = findClosestDirection(
      presence.heading.degrees,
      panoLinks,
    );
    if (!bestMatchLink) {
      console.log(
        "[sv] No link available from where we are!",
      );
      return createObeyingMovementResult();
    }

    const newHeading = bestMatchLink.heading;
    const newPosition: { latitude: number; longitude: number } =
      computeDestinationPoint(
        { latitude: currentLat, longitude: currentLon },
        movement.meters,
        newHeading,
      );

    const newPresence = {
      position: [newPosition.latitude, newPosition.longitude] satisfies LatLong,
      heading: { degrees: newHeading },
    };
    console.log("[sv] get distance", {
      from: { currentLat, currentLon },
      to: newPosition,
    });
    const meters = getDistance(
      { latitude: currentLat, longitude: currentLon },
      newPosition,
    );
    const movementActual: Movement = {
      meters,
      heading: { degrees: newHeading },
    };
    return { movementActual, presence: newPresence };
  }
}
