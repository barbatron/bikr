import { bikeRoute } from "../core/session-main.ts";
import GoogleMap from "../islands/GoogleMap.tsx";
import GoogleMapsLibraryContext from "../islands/GoogleMapsLibraryContext.tsx";
import GoogleMapsRouteContext from "../islands/GoogleMapsRouteContext.tsx";

export default function Home() {
  const API_KEY = Deno.env.get("GOOGLE_MAP_API_KEY")!;
  const MAP_ID = Deno.env.get("GOOGLE_MAP_ID")!;

  return (
    <GoogleMapsLibraryContext
      apiKey={API_KEY}
    >
      <GoogleMapsRouteContext
        startAt={bikeRoute.routeStart.pos}
        endAt={bikeRoute.routeEnd}
      >
        <GoogleMap
          mapId={MAP_ID}
          zoomLevel={18}
        >
        </GoogleMap>
      </GoogleMapsRouteContext>
    </GoogleMapsLibraryContext>
  );
}
