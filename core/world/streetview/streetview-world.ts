import { BehaviorSubject, Observable } from "rxjs";
import { LatLong, Movement, World } from "../../types.ts";
import { GoogleMapsRouteTracker } from "./gm-route-tracker.ts";
import {
  findClosestDirection,
  StreetViewLinkResolver,
  toLatLong,
} from "./streetview-utils.ts";
import {
  GoogleStreetViewPresence,
  GoogleStreetViewPresenceWorldData,
  RoutePresence,
} from "./types.ts";

export type StreetViewWorldParams = {
  route: GoogleMapsRouteTracker;
  linkResolver?: StreetViewLinkResolver;
  movementsModifier?: (movements: Observable<Movement>) => Observable<Movement>;
};

export class StreetViewWorld implements World<GoogleStreetViewPresence> {
  private readonly presenceSource: BehaviorSubject<GoogleStreetViewPresence>;
  private readonly linkResolver?: StreetViewLinkResolver;
  private readonly route: GoogleMapsRouteTracker;
  private readonly movementsModifier: (
    movements: Observable<Movement>,
  ) => Observable<Movement>;

  public constructor(
    { route, linkResolver, movementsModifier }: StreetViewWorldParams,
  ) {
    this.route = route;
    this.linkResolver = linkResolver;
    this.movementsModifier = movementsModifier ?? ((x) => x);
    const { position, heading } = route.getInitialPresence();
    const posAsLatLong = toLatLong(position);
    const routePresence = this.route.queryPresence(0);
    this.presenceSource = new BehaviorSubject<GoogleStreetViewPresence>(
      {
        position: posAsLatLong,
        heading,
        world: this.toWorldData(routePresence),
      },
    );
  }

  toWorldData(routePresence: RoutePresence): GoogleStreetViewPresenceWorldData {
    // Prefer junctionInfo from next route point so that maneuver instructions are presented when closing in on a junction
    const junctionInfo = routePresence?.nextRoutePoint?.junctionInfo ??
      routePresence?.routePoint.junctionInfo;
    return { routePresence, junctionInfo };
  }

  createPresence() {
    if (this.linkResolver) {
      this.updatePresence(
        this.presenceSource.value.position,
        this.presenceSource.value.heading.degrees,
        this.presenceSource.value.world,
      );
    }
    return this.presenceSource.asObservable();
  }

  consume(movements: Observable<Movement>) {
    this.movementsModifier(movements)
      .subscribe((movement) => this.handleMovement(movement));
  }

  private async updatePresence(
    newPosition: LatLong,
    direction: number,
    worldData: GoogleStreetViewPresenceWorldData,
  ) {
    const links = this.linkResolver ? await this.linkResolver(newPosition) : [];
    const closestDirection = links.length
      ? findClosestDirection(
        direction,
        links,
      ).link.heading
      : direction;
    const newPresence = {
      position: newPosition,
      heading: { degrees: closestDirection },
      world: worldData,
    };
    this.presenceSource.next(newPresence);
  }

  private handleMovement(movement: Movement) {
    const presence = this.presenceSource.value; // Hacky
    console.log("[sv] handleMovement", { presence, movement });

    const routePresence = this.route.queryPresence(movement.total.meters);
    console.log("[sv] routePresence", routePresence);
    if (!routePresence) return;

    return this.updatePresence(
      routePresence.position,
      routePresence.heading.degrees,
      this.toWorldData(routePresence),
    );
  }
}
