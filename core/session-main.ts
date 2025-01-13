import { BehaviorSubject, interval, map, pairwise } from "rxjs";
// import { speedStream } from "./bike-telemetry";
import { combineLatestWith } from "rxjs/operators";
import { createPresence } from "./session.ts";
import { LatLong, Movement } from "./types.ts";
import { World } from "./world/world.ts";

// https://www.google.com/maps/place/59%C2%B015'19.6%22N+18%C2%B004'53.1%22E/@59.2554025,18.0814542,17z/data=!4m4!3m3!8m2!3d59.25543!4d18.081405!5m1!1e4?entry=ttu&g_ep=EgoyMDI0MTIxMS4wIKXMDSoASAFQAw%3D%3D
export const startPosition: LatLong = [59.25525829440903, 18.08159134326138];
export const startDirection = 345;

export const presence = createPresence(startPosition, startDirection);
// const world = new TestWorld([
//   [18.080966137329995, 59.25573603011762],
//   [18.080966137329995, 59.25435999856927],
//   [18.083203716452743, 59.25435999856927],
//   [18.083203716452743, 59.25573603011762],
//   [18.080966137329995, 59.25573603011762],
// ].map(([lng, lat]) => [lat, lng]));

const speeds = [0, 2, 5, 7, 10, 10, 10, 4, 2, -1];
const speedStream = interval(2000).pipe(
  map((i) => speeds[i % speeds.length]),
);

const roundTo = (num: number, places: number) =>
  Math.round(num * 10 ** places) / 10 ** places;

const roundPosition = (
  [lat, lng]: LatLong,
) => [roundTo(lat, 6), roundTo(lng, 6)];
export const worldSource = new BehaviorSubject<World | null>(null);
export const directionSource = new BehaviorSubject<number>(startDirection);

export const trip = speedStream
  .pipe(
    // Attach timestamps
    map((speed) => ({ speed, timestamp: new Date() })),
    // Provide last + previous speed/timestamp tuple to get deltas
    pairwise(),
    // take(speeds.length - 1),
    combineLatestWith(worldSource, directionSource),
  )
  .subscribe(([[prev, next], world, direction]) => {
    console.log("[trip] update", { speed: { prev, next }, direction });
    const avgSpeedMetersPerSecond = next.speed;
    const timeDeltaMillis = next.timestamp.getTime() - prev.timestamp.getTime();
    const timeDelta = timeDeltaMillis / 1000;
    const distance = avgSpeedMetersPerSecond * timeDelta;
    const movement: Movement = {
      meters: roundTo(distance, 2),
      heading: { degrees: direction },
    };
    console.log("[trip]", {
      avgSpeed: avgSpeedMetersPerSecond,
      timeDelta,
      distance: roundTo(distance, 2),
    });
    if (!world) {
      console.warn("No world - no movement (smh)");
      return;
    }
    console.log("world takes it from here:");
    world
      .handleMovement({ presence: presence.value, movement })
      .then((result) => {
        console.log("[trip world] result", {
          before: roundPosition(presence.value.position),
          after: result?.presence?.position &&
            roundPosition(result?.presence?.position),
        });
        if (!result) {
          console.log("[trip world] no result - no movement");
          return;
        }
        console.log("[trip world] back to presence");
        presence.next(result.presence);
      });
  });

presence.subscribe((presence) => {
  console.log("[presence]", presence);
});
