import { startDirection, startPosition } from "../core/session-main.ts";
import GoogleMapIsland from "../islands/GoogleMapIsland.tsx";

export default function Home() {
  console.log("[home] render", { startPosition, startDirection });
  const API_KEY = Deno.env.get("GOOGLE_MAP_API_KEY")!;
  const MAP_ID = Deno.env.get("GOOGLE_MAP_ID")!;
  return (
    <GoogleMapIsland
      apiKey={API_KEY}
      mapId={MAP_ID}
      zoomLevel={18}
    />
  );
}
