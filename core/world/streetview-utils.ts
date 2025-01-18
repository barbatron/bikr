import { NewHeadingResult, StreetViewLinkWithHeading } from "../types.ts";
import { diffHeading } from "../utils.ts";

export const toValidLinks = (
  links:
    | (google.maps.StreetViewLink | StreetViewLinkWithHeading | null)[]
    | null,
): StreetViewLinkWithHeading[] =>
  (links ?? []).filter((l) => typeof l?.heading === "number").map(
    (l) => l as StreetViewLinkWithHeading,
  );

export function findClosestDirection(
  currentDirection: number,
  links:
    | (google.maps.StreetViewLink | StreetViewLinkWithHeading | null)[]
    | null,
): NewHeadingResult {
  const validLinks = toValidLinks(links);
  return validLinks.reduce(
    // @ts-ignore deno buggy confuse
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

export function googleLatLongToLiteral(
  latLng: google.maps.LatLng | google.maps.LatLngLiteral,
): google.maps.LatLngLiteral {
  return latLng instanceof google.maps.LatLng ? latLng.toJSON() : latLng;
}
