import { BehaviorSubject, interval, map, pairwise } from "rxjs";
// import { speedStream } from "./bike-telemetry";
import { signal } from "npm:@preact/signals-core";
import { combineLatestWith } from "rxjs/operators";
import { LatLong, Movement, Presence } from "./types.ts";
import { presenceComparator, roundPosition, roundTo } from "./utils.ts";
import { World } from "./world/world.ts";
import { distinctUntilChanged } from "rxjs";
import { StreetViewLinkWithHeading } from "./world/streetview-utils.ts";

export const startPosition: LatLong = [59.292455, 18.1195134];
export const startDirection = 67.82;

export const bikeRoute = signal({
  routeStart: { lat: 59.261776, lng: 18.130394 },
  routeEnd: "Tyresö Centrum, 135 40 Tyresö",
});

export const startPresence = {
  position: startPosition,
  heading: { degrees: startDirection },
};
export const presence = new BehaviorSubject<Presence>(startPresence);

const speeds = [0.1, 2, 5, 7, 10, 10, 10, 4, 2, 0.5];
const speedStream = interval(2000).pipe(
  map((i) => speeds[i % speeds.length]),
);

export const worldSource = new BehaviorSubject<World | null>(null);
export const directionSource = new BehaviorSubject<number>(startDirection);

export const streetViewLinks = signal<StreetViewLinkWithHeading[]>([]);

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

export const distinctPresence = presence
  .pipe(
    distinctUntilChanged(presenceComparator),
  );

distinctPresence.subscribe((p) => {
  console.log(
    "[distinctPresence]",
    roundPosition(p.position),
    p.heading.degrees,
  );
});
