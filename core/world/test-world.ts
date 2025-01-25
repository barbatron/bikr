import { computeDestinationPoint, getPreciseDistance } from "geolib";
import { BehaviorSubject, Observable } from "rxjs";
import {
  AngleDegrees,
  LatLong,
  Movement,
  MovementRequest,
  Presence,
  World,
} from "../types.ts";
import { toLatLong } from "./streetview/streetview-utils.ts";
import { toGoogleLatLongLiteral } from "./streetview/index.ts";

type TestSpecific = { timestamp: string; index: number };
type TestPresence = Presence<LatLong, AngleDegrees, TestSpecific>;

export class TestWorld implements World<TestPresence> {
  presence: BehaviorSubject<TestPresence>;
  constructor() {
    this.presence = new BehaviorSubject({
      position: toLatLong([0, 0]),
      heading: { degrees: 0 },
      world: { timestamp: new Date().toISOString(), index: 0 },
    });
  }

  createPresence() {
    return this.presence.asObservable();
  }

  consume(movements: Observable<Movement>) {
    movements
      .subscribe((movement) => this.handleMovement(movement));
  }

  private handleMovement(
    movement: MovementRequest,
  ) {
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
      world: {
        timestamp: new Date().toISOString(),
        index: prevPresence.world.index + 1,
      },
    };

    const posDiff = getPreciseDistance(
      toGoogleLatLongLiteral(prevPresence.position),
      toGoogleLatLongLiteral(newPositionLatLong),
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
