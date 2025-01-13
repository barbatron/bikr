import { computeDestinationPoint, isPointInPolygon } from "geolib";
import { LatLong, Movement, TurnOptions } from "../types.ts";
import { MovementRequest, MovementResult, World } from "./world.ts";

type WorldBounds = LatLong[];

export class TestWorld implements World {
  constructor(public readonly bounds: Readonly<WorldBounds>) {}

  handleMovement(
    movementRequest: MovementRequest,
  ): Promise<MovementResult> {
    const { presence, movement } = movementRequest;
    const { meters } = movement;
    const newHeading = movement.hasOwnProperty("heading")
      ? movement.heading
      : null;
    const headingDegrees = newHeading?.degrees ?? presence.heading.degrees;
    const [lat, lon] = presence.position;
    const newPosition = computeDestinationPoint(
      { lat, lon },
      movement.meters,
      headingDegrees,
    );

    if (
      isPointInPolygon(
        newPosition,
        this.bounds.map(([lat, lon]) => ({ lat, lon })),
      )
    ) {
      console.log("Is within bounds");
    } else {
      console.warn("Is outside bounds");
      return Promise.resolve(null);
    }

    const newPositionLatLong: LatLong = [
      newPosition.latitude,
      newPosition.longitude,
    ];
    const newPresence = {
      position: newPositionLatLong,
      heading: { degrees: headingDegrees },
    };
    const movementActual: Movement = {
      meters,
      heading: { degrees: headingDegrees },
    };
    const turnOptions: TurnOptions = [];
    return Promise.resolve({
      movementActual,
      presence: newPresence,
      turnOptions,
    });
  }
}
