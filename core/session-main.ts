import { signal } from "@preact/signals-core";
import {
  BehaviorSubject,
  debounce,
  interval,
  pairwise,
  scan,
  timeInterval,
} from "npm:rxjs";
import { combineLatestWith, map, switchMap, tap } from "npm:rxjs/operators";
import { filter } from "rxjs";
import { speedStream } from "./bike-telemetry.ts";
import {
  AngleDegrees,
  LatLong,
  Movement,
  Presence,
  StreetViewLinkWithHeading,
} from "./types.ts";
import { World } from "./world/world.ts";
import { TestWorld } from "./world/test-world.ts";

export const bikeRoute = {
  routeStart: { lat: 59.2618299, lng: 18.1304439 },
  startDir: 112,
  routeEnd: "Tyresö Centrum, 135 40 Tyresö",
};

// const nackaReservSaltsjo = {
//   position: [59.2848213, 18.2077248] satisfies LatLong,
//   heading: 90,
// };

export const startPosition = [
  bikeRoute.routeStart.lat,
  bikeRoute.routeStart.lng,
] satisfies LatLong;
export const startDirection = bikeRoute.startDir;

export const worldSource = new BehaviorSubject<
  World<Presence<LatLong, AngleDegrees>> | null
>(null);

export const presence = worldSource
  .pipe(
    filter((world) => world !== null),
    tap((w) => console.log("[presence] Got world", w)),
    switchMap((world) => world.createPresence()),
  );

export const directionSource = new BehaviorSubject<number>(startDirection).pipe(
  debounce(() => interval(1000)),
);

export const streetViewLinks = signal<StreetViewLinkWithHeading[]>([]);

const distanceSource = speedStream.pipe(
  timeInterval(), // Get time since last emit
  scan((acc, curr) => {
    if (curr.interval > 3000) {
      console.log("[distance] Too long since last update - ignoring update", {
        acc,
        curr,
      });
      return acc;
    }
    const speed = curr.value;
    const speedMps = speed / 3.6; // km/h -> m/s
    const distanceMeters = speedMps * curr.interval / 1000;
    console.log("[distance] Distance", {
      distanceMeters,
      speed,
      speedMps,
      interval: curr.interval,
    });
    return acc + distanceMeters;
  }, 0),
);

export const movementSource = distanceSource
  .pipe(
    tap((dist) => console.log("[trip] Distance", dist)),
    pairwise(),
    map(([prevDistance, totalDistance]) => {
      const distance = totalDistance - prevDistance;
      console.log("[trip] update", {
        distance,
        prevDistance,
        totalDistance,
      });
      const movement: Movement = {
        meters: distance,
      };
      return movement;
    }),
  );

const testWorld = new TestWorld();

movementSource.pipe(
  tap((movement) => console.log("[trip] Movement", movement)),
  combineLatestWith(worldSource),
).subscribe(([movement, world]) => {
  if (!world) {
    console.log(
      "[movement -> world] No world to handle movement - sending to test world",
      movement,
    );
  }
  (world ?? testWorld).handleMovement(movement);
});
