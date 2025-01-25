import { computeDestinationPoint } from "geolib";
import { BehaviorSubject, bufferTime, filter, map, Observable } from "rxjs";
import {
  AngleDegrees,
  LatLong,
  Movement,
  MovementRequest,
  World,
} from "../../types.ts";
import {
  findClosestDirection,
  StreetViewLinkResolver,
  toGoogleLatLongLiteral,
} from "./streetview-utils.ts";
import { GoogleStreetViewPresence, RouteLike } from "./types.ts";

export class StreetViewWorld implements World<GoogleStreetViewPresence> {
  private readonly presenceSource: BehaviorSubject<GoogleStreetViewPresence>;
  public constructor(
    public readonly sv: google.maps.StreetViewService,
    private readonly route: RouteLike<LatLong, AngleDegrees>,
    private readonly linkResolver: StreetViewLinkResolver,
    public readonly searchRadius = 50,
  ) {
    const { position, heading } = route.getInitialPresence();
    this.presenceSource = new BehaviorSubject<GoogleStreetViewPresence>(
      {
        position,
        heading,
        world: { pano: "" },
      },
    );
  }

  createPresence() {
    const initialPresence = this.route.getInitialPresence();
    console.log(
      "[sv] createPresence: getting panorama at initial position",
      initialPresence,
    );
    this.sv.getPanorama({
      location: toGoogleLatLongLiteral(initialPresence.position),
      preference: google.maps.StreetViewPreference.NEAREST,
    }, (data, status) => {
      if (status !== google.maps.StreetViewStatus.OK) {
        throw Error(
          "No panorama found at suggested position: " +
            JSON.stringify(initialPresence.position),
        );
      }
      const d = data!;
      const position: LatLong = [
        d.location!.latLng?.lat()!,
        d.location!.latLng?.lng()!,
      ];
      const headingResult = findClosestDirection(
        initialPresence.heading.degrees,
        d.links!,
      );
      if (!headingResult) throw Error("No heading result");
      const p: GoogleStreetViewPresence = {
        position,
        heading: { degrees: headingResult.link.heading },
        world: { pano: headingResult.link.pano! },
      };
      console.log("[sv] createPresence: initial presence determined", p);
      this.presenceSource.next(p);
    });
    return this.presenceSource.asObservable();
  }

  consume(movements: Observable<Movement>) {
    movements
      .pipe(
        // Buffer & sum up movements to prevent spamming map api
        // Should ideally be synchronized with the street view panorama updates?
        bufferTime(1000),
        map((movements) => ({
          meters: movements.reduce((acc, curr) => acc + curr.meters, 0),
        })),
        filter((m) => m.meters > 0),
      )
      .subscribe((movement) => this.handleMovement(movement));
  }

  private async handleMovement(
    movement: MovementRequest,
  ) {
    const presence = this.presenceSource.value; // Hacky

    console.log("[sv] handleMovement", { presence, movement });

    const [currentLat, currentLon] = presence.position;

    // Check if close to a route nav point
    const junction = this.route.queryJunction(presence.position);
    if (junction) {
      console.log("[sv] Close to a route nav point!", junction);
    }

    // If we're not close to a route nav point, use panorama links to determine direction:
    const panoLinks = await this.linkResolver(presence.position);
    if (!panoLinks || panoLinks.length === 0) {
      console.log("[sv] No links available!");
      return; // TODO: MOVE ANYWAY LOL
    }

    const nextDirection = (junction && junction.junction.distance < 10)
      ? junction.junction.turnDirection
      : presence.heading.degrees;

    console.log("[sv] Next direction determined", {
      current: presence.heading.degrees,
      ...(junction &&
        {
          junctionDistance: junction?.junction.distance,
          junctionDirection: junction?.junction.turnDirection,
        }),
      nextDirection,
    });

    const bestMatchLink = findClosestDirection(
      nextDirection,
      panoLinks,
    );

    const newHeading = bestMatchLink.link.heading;
    const newPosition: { latitude: number; longitude: number } =
      computeDestinationPoint(
        { latitude: currentLat, longitude: currentLon },
        movement.meters,
        newHeading,
      );

    const newPresence = {
      position: [newPosition.latitude, newPosition.longitude] satisfies LatLong,
      heading: { degrees: newHeading },
      world: { pano: bestMatchLink.link.pano! },
    };
    console.log("[sv] New presence determined", newPresence);

    this.presenceSource.next(newPresence);
  }
}
