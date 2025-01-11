import { IS_BROWSER } from "$fresh/runtime.ts";
import { ComponentChildren, createContext } from "preact";
import { useState } from "preact/hooks";
import GoogleMap, { GoogleMapProps } from "../components/GoogleMap.tsx";

export type MapsLibs = typeof google.maps

export const googleMapsContext = createContext<MapsLibs | null>(null);

function GoogleMapsProvider(props: { children: ComponentChildren, apiKey: string }) {
  if (!IS_BROWSER) {
    return (
      <p>Google Maps must be loaded on the client. No children will render</p>
    );
  }

  const [googleMaps, setGoogleMaps] = useState<typeof google.maps | null>(null);
  return (
    <>
      {/* Load Leaflet JS */}
      <script
        onLoad={(x) => setGoogleMaps(google.maps)}
        src={`https://maps.googleapis.com/maps/api/js?key=${props.apiKey}&libraries=maps,marker,streetView`}
        // integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        crossorigin=""
      />
      {/* Provide Leaflet context to children */}
      <googleMapsContext.Provider value={googleMaps}>
        {props.children}
      </googleMapsContext.Provider>
    </>
  );
}

export default function MapIsland(props: GoogleMapProps & { apiKey: string }) {
  return (
    <GoogleMapsProvider apiKey={props.apiKey}>
      <GoogleMap {...props} />
    </GoogleMapsProvider>
  );
}