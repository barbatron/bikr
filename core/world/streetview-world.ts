// @deno-types="npm:@types/google.maps"
import { computeDestinationPoint, getDistance } from "geolib";
import { Movement } from "../types.ts";
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
    const [lat, lon] = presence.position;

    const { data }: google.maps.StreetViewResponse = await this.sv.getPanorama({
      location: {
        lat,
        lng: lon,
      },
      radius: this.searchRadius,
    });

    const createObeyingMovementResult = (): MovementResult => {
      const proposedPosition = computeDestinationPoint(
        { lat, lon },
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
    const newPosition = computeDestinationPoint(
      { lat, lon },
      movement.meters,
      newHeading,
    );

    const newPresence = {
      position: newPosition,
      heading: { degrees: headingDegrees },
    };
    const meters = getDistance({ lat, lon }, {
      lat: newPosition[0],
      lon: newPosition[1],
    });
    const movementActual: Movement = {
      meters,
      heading: { degrees: headingDegrees },
    };
    return { movementActual, presence: newPresence, turnOptions: [] };
  }
}
