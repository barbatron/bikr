import { BehaviorSubject, interval, map, pairwise } from "rxjs";
// import { speedStream } from "./bike-telemetry";
import { combineLatestWith } from "rxjs/operators";
import { createPresence } from "./session.ts";
import { LatLong, Movement } from "./types.ts";
import { World } from "./world/world.ts";
import { roundPosition, roundTo } from "./utils.ts";
import { signal } from "npm:@preact/signals-core";
import { speedStream } from "./bike-telemetry.ts";
import { throttle } from "rxjs";

const nackaReservSaltsjo = {
  position: [59.2848213, 18.2077248] satisfies LatLong,
  heading: 90,
};
export const startPosition = nackaReservSaltsjo.position;
export const startDirection = nackaReservSaltsjo.heading;

export const bikeRoute = signal({
  routeStart: { lat: 59.261776, lng: 18.130394 },
  routeEnd: "Tyresö Centrum, 135 40 Tyresö",
});

export const presence = createPresence(startPosition, startDirection);
// const world = new TestWorld([
//   [18.080966137329995, 59.25573603011762],
//   [18.080966137329995, 59.25435999856927],
//   [18.083203716452743, 59.25435999856927],
//   [18.083203716452743, 59.25573603011762],
//   [18.080966137329995, 59.25573603011762],
// ].map(([lng, lat]) => [lat, lng]));

// const speeds = [0.1, 2, 5, 7, 10, 10, 10, 4, 2, 0.5];
// const speedStream = interval(2000).pipe(
//   map((i) => speeds[i % speeds.length]),
// );

export const worldSource = new BehaviorSubject<World | null>(null);
export const directionSource = new BehaviorSubject<number>(startDirection);

export const streetViewLinks = signal<google.maps.StreetViewLink[]>([]);

export const trip = speedStream
  .pipe(
    throttle(() => interval(1000)),
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
    const distance = avgSpeedMetersPerSecond * (timeDelta < 5 ? timeDelta : 1);
    const movement: Movement = {
      meters: roundTo(distance, 2),
      heading: { degrees: direction },
    };
    console.log("[trip] calculated speed/timedelta/distance", {
      avgSpeed: avgSpeedMetersPerSecond,
      timeDelta,
      distance: roundTo(distance, 2),
    });
    if (!world) {
      console.warn("[trip] No world - no movement, smh");
      return;
    }
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
