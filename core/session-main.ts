import { BehaviorSubject, pairwise, scan, timeInterval } from "npm:rxjs";
import { map, switchMap, tap } from "npm:rxjs/operators";
import { filter } from "rxjs";
import { speedSourceKph } from "./bike-telemetry.ts";
import { AngleDegrees, LatLong, Movement, Presence, World } from "./types.ts";
import { TestWorld } from "./world/test-world.ts";
import routes from "./routes.json" with { type: "json" };
import { GoogleLatLngAny } from "./world/streetview/types.ts";

type SomeFuckingPositionStopComplaining = GoogleLatLngAny | [number, number];
type SomeFuckingRouteStopComplaining = [
  SomeFuckingPositionStopComplaining,
  SomeFuckingPositionStopComplaining,
];

export const bikeRoute: SomeFuckingRouteStopComplaining =
  routes["Saint-Germain-du-Seudre"];

export const startPosition = { lat: 0, lng: 0 };
export const startDirection = 0;

const distanceSource = speedSourceKph.pipe(
  timeInterval(), // Get time since last emit
  scan((acc, curr) => {
    if (curr.interval > 3000) {
      console.log(
        "[distanceSource] Too long since last speed update - ignoring",
        {
          totalDistance: acc,
          timeSinceLast: curr.interval,
          speedKph: curr.value,
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
    pairwise(),
    map(([prevDistance, totalDistance]) => {
      const distanceMeters = totalDistance - prevDistance;
      console.log("[movementSource] distance update", {
        distanceMeters,
        prevDistance,
        totalDistance,
      });
      const movement: Movement = {
        relative: { meters: distanceMeters },
        total: { meters: totalDistance },
      };
      return movement;
    }),
  );

export const worldSource = new BehaviorSubject<
  World<Presence<LatLong, AngleDegrees>> | null
>(new TestWorld());

// This doesn't feel right :D
worldSource.pipe(tap((w) => console.log("[worldSource] Got world", w)))
  .subscribe((w) => w?.consume(movementSource));

export const presence = worldSource
  .pipe(
    filter((world) => world !== null),
    switchMap((world) => world.createPresence()),
    tap((p) => console.log("[presence] Created presence", p)),
  );
