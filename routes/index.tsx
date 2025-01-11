import { startPosition } from "../core/session-main.ts";
import GoogleMapIsland from "../islands/GoogleMapIsland.tsx";

export default function Home() {
  const [lat, lng] = startPosition;
  const API_KEY = Deno.env.get("GOOGLE_MAP_API_KEY")!;

  return (
    <GoogleMapIsland
      apiKey={API_KEY}
      mapId={Deno.env.get("GOOGLE_MAP_ID")!}
      lat={lat}
      lng={lng}
      zoomLevel={18}
    />
  );
}
