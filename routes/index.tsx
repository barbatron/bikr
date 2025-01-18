import GoogleMap from "../islands/GoogleMap.tsx";
import { startDirection, startPosition } from "../core/session-main.ts";
import GoogleMapsLibraryContext from "../islands/GoogleMapsLibraryContext.tsx";
// import { useSignal } from "npm:@preact/signals";

export default function Home() {
  const [lat, lng] = startPosition;
  const API_KEY = Deno.env.get("GOOGLE_MAP_API_KEY")!;
  const MAP_ID = Deno.env.get("GOOGLE_MAP_ID")!;
  // const bikeRouteSignal = useSignal<google.maps.DirectionsRoute[]>([]);

  return (
    <GoogleMapsLibraryContext
      apiKey={API_KEY}
    >
      <GoogleMap
        mapId={MAP_ID}
        lat={lat}
        lng={lng}
        startDirection={startDirection}
        zoomLevel={18}
      >
      </GoogleMap>
    </GoogleMapsLibraryContext>
  );
}
