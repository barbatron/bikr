export * from "./streetview-utils.ts";
export * from "./streetview-world.ts";

import { signal } from "@preact/signals-core";
import {
  StreetViewLinkResolver,
  StreetViewLinkWithHeading,
} from "./streetview-utils.ts";

export const signalLinksResolver: StreetViewLinkResolver = () => {
  return Promise.resolve(streetViewLinks.value);
};

export const streetViewLinks = signal<StreetViewLinkWithHeading[]>([]);
