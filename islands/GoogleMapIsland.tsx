import { IS_BROWSER } from "$fresh/runtime.ts";
import { ComponentChildren, createContext } from "preact";
import { useMemo, useState } from "preact/hooks";
import GoogleMap, { GoogleMapProps } from "../components/GoogleMap.tsx";

export type MapsLibs = typeof google.maps;

export const googleMapsContext = createContext<MapsLibs | null>(null);

function GoogleMapsProvider(
  props: { children: ComponentChildren; apiKey: string },
) {
  if (!IS_BROWSER) {
    return (
      <p>Google Maps must be loaded on the client. No children will render</p>
    );
  }

  const [googleMaps, setGoogleMaps] = useState<typeof google.maps | null>(null);

  //06:52:12:65:60:CA:7F:5D:E6:72:0C:26:3B:A8:C5:A9:51:68:4D:2C:E4:2D:0C:4E:F7:63:D2:99:8C:AE:D8:06
  return (
    <>
      <script
        onLoad={() => {
          console.log("Loaded script");
          if (!googleMaps) setGoogleMaps(google.maps);
        }}
        src={`https://maps.googleapis.com/maps/api/js?key=${props.apiKey}&libraries=maps,marker,streetView`}
        integrity="sha256-XIu4I5cCy8z6GxBYv6ea58vGyKTcKkr11l+9LO6foBw="
        crossorigin=""
      />
      {/* Provide context to children */}
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
