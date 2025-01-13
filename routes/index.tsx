import { startDirection, startPosition } from "../core/session-main.ts";
import GoogleMapIsland from "../islands/GoogleMapIsland.tsx";

export default function Home() {
  const [lat, lng] = startPosition;
  const API_KEY = Deno.env.get("GOOGLE_MAP_API_KEY")!;
  const MAP_ID = Deno.env.get("GOOGLE_MAP_ID")!;
  return (
    <GoogleMapIsland
      apiKey={API_KEY}
      mapId={MAP_ID}
      lat={lat}
      lng={lng}
      startDirection={startDirection}
      zoomLevel={18}
    />
  );
}
