import { BehaviorSubject, pairwise, scan, timeInterval } from "npm:rxjs";
import { combineLatestWith, map, switchMap, tap } from "npm:rxjs/operators";
import { filter } from "rxjs";
import { speedSourceKph } from "./bike-telemetry.ts";
import { AngleDegrees, LatLong, Movement, Presence, World } from "./types.ts";
import { TestWorld } from "./world/test-world.ts";

// deno-lint-ignore no-unused-vars
const flatenStart = { pos: { lat: 59.2618299, lng: 18.1304439 }, dir: 90 };
const nackaStart = { pos: { lat: 59.2848213, lng: 18.2077248 }, dir: 270 };

export const bikeRoute = {
  routeStart: nackaStart,
  routeEnd: "Tyresö Centrum, 135 40 Tyresö",
};

export const startPosition: LatLong = [
  bikeRoute.routeStart.pos.lat,
  bikeRoute.routeStart.pos.lng,
];

export const startDirection = bikeRoute.routeStart.dir;

export const worldSource = new BehaviorSubject<
  World<Presence<LatLong, AngleDegrees>> | null
>(null);

export const presence = worldSource
  .pipe(
    filter((world) => world !== null),
    tap((w) => console.log("[presence] Got world", w)),
    switchMap((world) => world.createPresence()),
  );

const distanceSource = speedSourceKph.pipe(
  timeInterval(), // Get time since last emit
  scan((acc, curr) => {
    if (curr.interval > 3000) {
      console.log(
        "[distanceSource] Too long since last update - ignoring update",
        {
          acc,
          curr,
        },
      );
      return acc;
    }
    const speedKph = curr.value;
    const speedMps = speedKph / 3.6; // km/h -> m/s
    const distanceMeters = speedMps * curr.interval / 1000;
    console.log("[distanceSource] Distance", {
      distanceMeters,
      speedKph,
      speedMps,
      interval: curr.interval,
    });
    return acc + distanceMeters;
  }, 0),
);

export const movementSource = distanceSource
  .pipe(
    tap((dist) => console.log("[movementSource] Distance", dist)),
    pairwise(),
    map(([prevDistance, totalDistance]) => {
      const distance = totalDistance - prevDistance;
      console.log("[movementSource] update", {
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

// Hook up movement to world
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
