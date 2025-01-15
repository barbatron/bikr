// @deno-types="npm:@types/google.maps"
import { computeDestinationPoint, getDistance } from "geolib";
import { LatLong, Movement } from "../types.ts";
import { MovementRequest, MovementResult, World } from "./world.ts";

export class StreetViewWorld implements World {
  public constructor(
    public readonly sv: google.maps.StreetViewService,
    public readonly searchRadius = 50,
  ) {}

  async handleMovement(
    movementRequest: MovementRequest,
  ): Promise<MovementResult> {
    const { presence, movement } = movementRequest;
    console.log("[sv] handleMovement", { presence, movement });
    const headingDegrees = movementRequest.movement.heading.degrees;
    const [currentLat, currentLon] = presence.position;

    const { data }: { data: google.maps.StreetViewPanoramaData } = await this.sv
      .getPanorama({
        location: {
          lat: currentLat,
          lng: currentLon,
        },
        radius: this.searchRadius,
      });

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
        turnOptions: [],
      };
    };

    if (!data) {
      console.warn(
        "No street view available at current position! Obeying movement request.",
      );
      return createObeyingMovementResult();
    }

    console.log("[sv] data (current)", data);
    const panoLinks = data.links;

    // Find link with heading value closest to trip.heading.degrees:
    const newHeadingResult: {
      minDiff: number;
      link: google.maps.StreetViewLink | null;
    } | undefined = panoLinks?.reduce(
      // @ts-ignore deno buggy confuse
      (acc, link) => {
        if (link?.heading) {
          const diffSqr = Math.pow(
            link.heading - presence.heading.degrees,
            2,
          );
          if (!acc.minDiff || diffSqr < acc.minDiff) {
            return { minDiff: diffSqr, link };
          }
        }
        return acc;
      },
      { minDiff: Infinity, link: null } as {
        minDiff: number;
        link: google.maps.StreetViewLink | null;
      },
    );
    if (!newHeadingResult?.link?.heading) {
      console.log(
        "[sv] No link available from where we are!",
      );
      return createObeyingMovementResult();
    }
    console.log(
      "[sv] Best fit link found",
      newHeadingResult.link.heading,
    );

    const newHeading = newHeadingResult.link.heading;
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
    return { movementActual, presence: newPresence, turnOptions: [] };
  }
}
