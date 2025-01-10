import GoogleMap from "../islands/GoogleMap.tsx";
import { startPosition } from "../core/session-main.ts";

export default function Home() {
  const [lat, lng] = startPosition;
  return <GoogleMap lat={lat} lng={lng} zoomLevel={18} />;
}
