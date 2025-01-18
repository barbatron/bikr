import {
  BehaviorSubject,
  debounce,
  interval,
  map,
  pairwise,
  throttle,
} from "rxjs";
import { combineLatestWith } from "rxjs/operators";
import { speedStream } from "./bike-telemetry.ts";
import {
  LatLong,
  Movement,
  Presence,
  StreetViewLinkWithHeading,
} from "./types.ts";
import { roundPosition, roundTo } from "./utils.ts";
import { World } from "./world/world.ts";
import { signal } from "@preact/signals-core";

const nackaReservSaltsjo = {
  position: [59.2848213, 18.2077248] satisfies LatLong,
  heading: 90,
};
export const startPosition = nackaReservSaltsjo.position;
export const startDirection = nackaReservSaltsjo.heading;

export const bikeRoute = {
  routeStart: { lat: 59.261776, lng: 18.130394 },
  routeEnd: "Tyresö Centrum, 135 40 Tyresö",
};

export const startPresence: Readonly<Presence> = {
  position: startPosition,
  heading: { degrees: startDirection },
};
export const presence = new BehaviorSubject<Presence>(startPresence);

export const worldSource = new BehaviorSubject<World | null>(null);

export const directionSource = new BehaviorSubject<number>(startDirection).pipe(
  debounce(() => interval(1000)),
);

export const streetViewLinks = signal<StreetViewLinkWithHeading[]>([]);

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
    const avgSpeedMetersPerSecond = next.speed / 3.6; // km/h -> m/s
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
    const movementRequest = { presence: presence.value, movement };
    if (!world) {
      console.warn("[trip] No world - no movement, smh");
      return;
    }
    world
      .handleMovement(movementRequest)
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
