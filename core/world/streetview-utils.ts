type StreetViewLinkWithHeading = google.maps.StreetViewLink & {
  heading: number;
};
type NewHeadingResult = {
  minDiff: number;
  link: StreetViewLinkWithHeading;
} | null;

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
