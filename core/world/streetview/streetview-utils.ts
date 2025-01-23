import { LatLong } from "../../types.ts";
import { diffHeading } from "../../utils.ts";

export type StreetViewLinkWithHeading = google.maps.StreetViewLink & {
  heading: number;
};

export type NewHeadingResult = {
  minDiff: number;
  link: StreetViewLinkWithHeading;
};

export const toValidLinks = (
  links:
    | (google.maps.StreetViewLink | StreetViewLinkWithHeading | null)[]
    | null,
): StreetViewLinkWithHeading[] =>
  (links ?? []).filter((l) => typeof l?.heading === "number").map(
    (l) => l as StreetViewLinkWithHeading,
  );

export function findClosestDirection<
  TLinks extends
    | (google.maps.StreetViewLink | StreetViewLinkWithHeading | null)[]
    | null,
>(
  currentDirection: number,
  links: TLinks,
): TLinks extends StreetViewLinkWithHeading[] ? NewHeadingResult
  : (NewHeadingResult | null) {
  const validLinks = toValidLinks(links);
  // @ts-ignore - if we DID get SVLWH[] then we DEFINITELY will have a result with a link
  return validLinks.reduce(
    (acc, link) => {
      const diff = diffHeading(currentDirection, link.heading);
      if (!acc || diff < acc.minDiff) {
        return { minDiff: diff, link };
      }
      return acc;
    },
    null as {
      minDiff: number;
      link: StreetViewLinkWithHeading;
    } | null,
  );
}

export function toGoogleLatLongLiteral(
  latLng: google.maps.LatLng | google.maps.LatLngLiteral | LatLong,
): google.maps.LatLngLiteral {
  if (latLng instanceof Array) {
    // Is LatLong
    return { lat: latLng[0], lng: latLng[1] };
  }
  return latLng instanceof google.maps.LatLng ? latLng.toJSON() : latLng;
}

export type StreetViewLinkResolver = {
  (position: LatLong): Promise<StreetViewLinkWithHeading[]>;
};

export const createMapsApiLinksResolver =
  (streetViewService: google.maps.StreetViewService): StreetViewLinkResolver =>
  (position) => {
    const latLng = toGoogleLatLongLiteral(position);
    return new Promise((res) => {
      streetViewService.getPanorama({
        location: latLng,
        preference: google.maps.StreetViewPreference.NEAREST,
      }, (data, status) => {
        if (status !== google.maps.StreetViewStatus.OK) {
          return [];
        }
        res(toValidLinks(data!.links!));
      });
    });
  };
