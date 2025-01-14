import {
  BehaviorSubject,
  combineLatestWith,
  map,
  Observable,
  pairwise,
} from "rxjs";
import { bikr } from "./types.ts";
import { roundTo } from "./utils.ts";

interface TripOptions {
  initialPresence: bikr.GeoPresence;
  world: bikr.World<bikr.GeoPosition, bikr.GeoDirection>;
  modeOfTransport: bikr.ModeOfTransport;
}

export class Trip {
  public readonly world: Readonly<
    bikr.World<bikr.GeoPosition, bikr.GeoDirection>
  >;
  public readonly modeOfTransport: Readonly<bikr.ModeOfTransport>;

  private readonly presenceSubject: BehaviorSubject<bikr.GeoPresence>;
  public presence(): Observable<bikr.GeoPresence> {
    return this.presenceSubject.asObservable();
  }

  public constructor(options: Readonly<TripOptions>) {
    this.world = options.world;
    this.modeOfTransport = options.modeOfTransport;
    this.presenceSubject = new BehaviorSubject(
      options.initialPresence,
    );
  }

  public begin() {
    const presenceSource = this.presence();
    // const middleware = this.world.getMiddleware();
    return this.modeOfTransport.speed.pipe(
      map((speed) => ({ ...speed, timestamp: new Date() })),
      pairwise(),
      combineLatestWith(presenceSource),
    )
      .subscribe(async ([[prev, next], presence]) => {
        console.log("[trip] update", { speed: { prev, next }, presence });
        const avgSpeedMetersPerSecond = next.speed.mps;
        const timeDeltaMillis = next.timestamp.getTime() -
          prev.timestamp.getTime();
        const timeDelta = timeDeltaMillis / 1000;
        const distance = avgSpeedMetersPerSecond * timeDelta;
        await this.world
          .handleMovement(presence, { mps: roundTo(distance, 2) })
          .then((newPresence) => this.presenceSubject.next(newPresence))
          .catch((err) => {
            console.error("[trip] error handling movement", err);
          });
      });
  }
}
