import { computeDestinationPoint } from "geolib";
import { BehaviorSubject, bufferTime, map, Observable } from "rxjs";
import {
  AngleDegrees,
  LatLong,
  Movement,
  MovementRequest,
  Presence,
  World,
} from "../../types.ts";
import {
  findClosestDirection,
  StreetViewLinkResolver,
  toGoogleLatLongLiteral,
} from "./streetview-utils.ts";

type GoogleStreetViewPresenceWorldData = { pano: string };
type GoogleStreetViewPresence = Presence<
  LatLong,
  AngleDegrees,
  GoogleStreetViewPresenceWorldData
>;

export class StreetViewWorld implements World<GoogleStreetViewPresence> {
  private readonly presenceSource: BehaviorSubject<GoogleStreetViewPresence>;
  public constructor(
    public readonly sv: google.maps.StreetViewService,
    private readonly initialPosition: LatLong,
    private readonly initialHeading: number,
    private readonly linkResolver: StreetViewLinkResolver,
    public readonly searchRadius = 50,
  ) {
    this.presenceSource = new BehaviorSubject<GoogleStreetViewPresence>(
      {
        position: initialPosition,
        heading: { degrees: initialHeading },
        world: { pano: "" },
      },
    );
  }

  createPresence() {
    console.log(
      "[sv] createPresence: getting panorama at initial position",
      this.initialPosition,
    );
    this.sv.getPanorama({
      location: toGoogleLatLongLiteral(this.initialPosition),
      preference: google.maps.StreetViewPreference.NEAREST,
    }, (data, status) => {
      if (status !== google.maps.StreetViewStatus.OK) {
        throw Error(
          "No panorama found at suggested position: " +
            JSON.stringify(this.initialPosition),
        );
      }
      const d = data!;
      const position: LatLong = [
        d.location!.latLng?.lat()!,
        d.location!.latLng?.lng()!,
      ];
      const headingResult = findClosestDirection(
        this.initialHeading,
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
      )
      .subscribe((movement) => this.handleMovement(movement));
  }

  private async handleMovement(
    movement: MovementRequest,
  ) {
    const presence = this.presenceSource.value; // Hacky

    console.log("[sv] handleMovement", { presence, movement });

    const [currentLat, currentLon] = presence.position;

    const panoLinks = await this.linkResolver(presence.position);

    if (!panoLinks || panoLinks.length === 0) {
      console.log("[sv] No links available!");
      return null;
    }

    const bestMatchLink = findClosestDirection(
      presence.heading.degrees,
      panoLinks,
    );
    if (!bestMatchLink) {
      console.log(
        "[sv] No link available from where we are!",
      );
      return null;
    }

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
