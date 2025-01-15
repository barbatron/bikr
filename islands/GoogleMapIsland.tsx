import { IS_BROWSER } from "$fresh/runtime.ts";
import { ComponentChildren, createContext } from "preact";
import { useContext, useState } from "preact/hooks";
import GoogleMap, { GoogleMapProps } from "../components/GoogleMap.tsx";
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

  const [googleMaps, setGoogleMaps] = useState<typeof google.maps | null>(null);

  return (
    <>
      <script
        onLoad={() => {
          console.log("Loaded script");
          if (!googleMaps) setGoogleMaps(google.maps);
          worldSource.next(
            new StreetViewWorld(new google.maps.StreetViewService()),
          );
        }}
        src={`https://maps.googleapis.com/maps/api/js?key=${props.apiKey}&libraries=maps,marker,streetView`}
        crossorigin=""
      />
      {/* Provide context to children */}
      <googleMapsContext.Provider value={googleMaps}>
        {props.children}
      </googleMapsContext.Provider>
    </>
  );
}

export default function GoogleMapIsland(
  props: GoogleMapProps & { apiKey: string },
) {
  return (
    <GoogleMapsProvider apiKey={props.apiKey}>
      <GoogleMap {...props} />
    </GoogleMapsProvider>
  );
}
