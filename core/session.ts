import { BehaviorSubject } from "rxjs";
import { LatLong, Presence } from "./types.ts";

// Session: starts at a position and with a direction, integrating speed to yield new position/direction tuples

export function createPresence(position: LatLong, directionDegs: number) {
  return new BehaviorSubject<Presence>({
    position,
    heading: { degrees: directionDegs },
  });
}
