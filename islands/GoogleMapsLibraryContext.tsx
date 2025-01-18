import { IS_BROWSER } from "$fresh/runtime.ts";
import { ComponentChildren, createContext } from "preact";
import { useState } from "preact/hooks";
import { worldSource } from "../core/session-main.ts";
import { StreetViewWorld } from "../core/world/streetview-world.ts";

export type MapsLibs = typeof google.maps;

export const googleMapsContext = createContext<MapsLibs | null>(null);

export function GoogleMapsProvider(
  props: { children: ComponentChildren; apiKey: string },
) {
  if (!IS_BROWSER) {
    return (
      <p>Google Maps must be loaded on the client. No children will render</p>
    );
  }

  const [googleMaps, setGoogleMaps] = useState<MapsLibs | null>(null);

  return (
    <>
      <script
        onLoad={() => {
          console.log("[gmlc] Loaded script", { hasCurrent: !!googleMaps });
          if (!googleMaps) setGoogleMaps(google.maps);
          worldSource.next(
            new StreetViewWorld(new google.maps.StreetViewService()),
          );
        }}
        src={`https://maps.googleapis.com/maps/api/js?key=${props.apiKey}&libraries=maps,marker,streetView,routes`}
        crossorigin=""
      />
      {/* Provide context to children */}
      <googleMapsContext.Provider value={googleMaps}>
        {props.children}
      </googleMapsContext.Provider>
    </>
  );
}

interface GoogleMapsLibraryContextProps {
  children: ComponentChildren;
  apiKey: string;
}

export default function GoogleMapsLibraryContext(
  { children, apiKey }: GoogleMapsLibraryContextProps,
) {
  return (
    <GoogleMapsProvider apiKey={apiKey}>
      {children}
    </GoogleMapsProvider>
  );
}
