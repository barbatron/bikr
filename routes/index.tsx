import GoogleMap from "../islands/GoogleMap.tsx";
import { startPosition } from "../core/session-main.ts";

export default function Home() {
  const [lat, lng] = startPosition;
  return <GoogleMap mapId={Deno.env.get("GOOGLE_MAP_ID")!} lat={lat} lng={lng} zoomLevel={18} />;
}
