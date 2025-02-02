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
import { toGoogleLatLongLiteral } from "./streetview/index.ts";

type TestSpecific = { timestamp: string; index: number };
type TestPresence = Presence<LatLong, AngleDegrees, TestSpecific>;

export class TestWorld implements World<TestPresence> {
  presence: BehaviorSubject<TestPresence>;
  constructor() {
    this.presence = new BehaviorSubject({
      position: { lat: 0, lng: 0 },
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
    const { lat, lng } = prevPresence.position;
    const newPosition = computeDestinationPoint(
      { lat, lng },
      movement.relative.meters,
      headingDegrees,
    );

    const newPositionLatLong = {
      lat: newPosition.latitude,
      lng: newPosition.longitude,
    };

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
