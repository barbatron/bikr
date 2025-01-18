import { IS_BROWSER } from "$fresh/runtime.ts";
import { ComponentChildren, createContext } from "preact";
import { useState } from "preact/hooks";
import { worldSource } from "../core/session-main.ts";
import { StreetViewWorld } from "../core/world/streetview-world.ts";

interface GoogleMapsLibraryContextProps {
  children: ComponentChildren;
  apiKey: string;
}

export const googleMapsContext = createContext<typeof google.maps | null>(null);

export default function GoogleMapsProvider(
  props: GoogleMapsLibraryContextProps,
) {
  if (!IS_BROWSER) {
    return (
      <p>Google Maps must be loaded on the client. No children will render</p>
    );
  }

  const [googleMaps, setGoogleMaps] = useState<typeof google.maps | null>(null);

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
      <googleMapsContext.Provider value={googleMaps}>
        {!googleMaps ? <p>Loading Google Maps...</p> : props.children}
      </googleMapsContext.Provider>
    </>
  );
}
