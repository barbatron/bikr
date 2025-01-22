import { computeDestinationPoint } from "geolib";
import { BehaviorSubject } from "rxjs";
import {
  AngleDegrees,
  LatLong,
  MovementRequest,
  Presence,
  World,
} from "../types.ts";

type WorldBounds = LatLong[];
type TestSpecific = { timestamp: number; index: number };
type TestPresence = Presence<LatLong, AngleDegrees, TestSpecific>;

export class TestWorld implements World<TestPresence> {
  presence: BehaviorSubject<TestPresence>;
  constructor(public readonly bounds?: Readonly<WorldBounds>) {
    this.presence = new BehaviorSubject({
      position: [0, 0] satisfies LatLong,
      heading: { degrees: 0 },
      world: { timestamp: Date.now(), index: 0 },
    });
  }

  createPresence() {
    return this.presence.asObservable();
  }

  handleMovement(
    movement: MovementRequest,
  ) {
    // const { presence, movement } = movementRequest;
    const prevPresence = this.presence.value;

    const headingDegrees = prevPresence.heading.degrees;
    const [lat, lon] = prevPresence.position;
    const newPosition = computeDestinationPoint(
      { lat, lon },
      movement.meters,
      headingDegrees,
    );

    const newPositionLatLong: LatLong = [
      newPosition.latitude,
      newPosition.longitude,
    ];
    const newPresence = {
      position: newPositionLatLong,
      heading: { degrees: headingDegrees },
      world: { timestamp: Date.now(), index: prevPresence.world.index + 1 },
    };

    const posDiff = Math.sqrt(
      Math.pow(newPresence.position[0] - prevPresence.position[0], 2) +
        Math.pow(newPresence.position[1] - prevPresence.position[1], 2),
    );
    const dirDiff = newPresence.heading.degrees - prevPresence.heading.degrees;

    console.log("[tw] handleMovement", {
      movement,
      prevPresence,
      newPresence,
      posDiff,
      dirDiff,
    });
    this.presence.next(newPresence);
  }
}
