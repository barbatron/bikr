import { LatLong, Presence } from "../types.ts";

export type StreetViewLinkWithHeading = google.maps.StreetViewLink & {
  heading: number;
};

type NewHeadingResult = {
  minDiff: number;
  link: StreetViewLinkWithHeading;
} | null;

export function toUsableLinks(
  links: null | (google.maps.StreetViewLink | null)[],
): StreetViewLinkWithHeading[] {
  return (links ?? []).filter((l) =>
    !!l && l !== null && typeof l.heading === "number"
  ).map(
    (l) => l as StreetViewLinkWithHeading,
  );
}

export function findClosestDirection(
  currentDirection: number,
  links: google.maps.StreetViewLink[],
): StreetViewLinkWithHeading | null {
  const validLinks = links.filter((l) => typeof l?.heading === "number").map(
    (l) => l as StreetViewLinkWithHeading,
  );
  const newHeadingResult: NewHeadingResult = validLinks.reduce(
    // @ts-ignore deno buggy confuse
    (acc, link) => {
      // Calculate the difference between currentDirection and the link heading, taking into account that 355 degrees is close to 0 degrees:
      const diff = Math.abs(link.heading - currentDirection) % 360;
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
  if (!newHeadingResult) {
    return null;
  }
  return newHeadingResult.link;
}

export function positionToLatLng(
  position: LatLong,
): google.maps.LatLngLiteral {
  return {
    lat: position[0],
    lng: position[1],
  };
}
export function presenceToLatLng(
  presence: Presence,
): google.maps.LatLngLiteral {
  return positionToLatLng(presence.position);
}
