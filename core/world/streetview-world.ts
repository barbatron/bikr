import {
  computeDestinationPoint,
  getCompassDirection,
  getDistance,
} from "geolib";
import { Movement } from "../types.ts";
import { MovementRequest, MovementResult, World } from "./world.ts";
import { LatLong } from "../types.ts";

export class StreetViewWorld implements World {
  public constructor(public readonly sv: google.maps.StreetViewService) {}

  async handleMovement(
    movementRequest: MovementRequest,
  ): Promise<MovementResult> {
    const { presence, movement } = movementRequest;
    console.log("[sv] handleMovement", { presence, movement });
    const headingDegrees = movementRequest.movement.heading.degrees;
    const [lat, lon] = presence.position;
    const proposedPosition = computeDestinationPoint(
      { lat, lon },
      movement.meters,
      headingDegrees,
    );
    const { data }: google.maps.StreetViewResponse = await this.sv.getPanorama({
      location: {
        lat: proposedPosition.latitude,
        lng: proposedPosition.longitude,
      },
      radius: 50,
    });

    if (!data) {
      console.warn("No street view available at point");
      return null;
    }
    console.log("[sv] data", data);
    const newPosition: LatLong = data.location?.latLng
      ? [data.location.latLng.lat(), data.location.latLng.lng()]
      : [lat, lon];
    const newPresence = {
      position: newPosition,
      heading: { degrees: headingDegrees },
    };
    const meters = getDistance({ lat, lon }, {
      lat: newPosition[0],
      lon: newPosition[1],
    });
    const newHeading = getCompassDirection({ lat, lon }, {
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
