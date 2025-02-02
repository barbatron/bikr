import { IS_BROWSER } from "$fresh/runtime.ts";
import {
  connectBikeTelemetry,
  MqttBikeTelemetryConfig,
  mqttBikeTelemetryConfig,
} from "../core/bike-telemetry.ts";
import { bikeRoute } from "../core/session-main.ts";
import { streetViewLinks } from "../core/world/streetview/index.ts";
import GoogleMap from "../islands/GoogleMap.tsx";
import GoogleMapsLibraryContext from "../islands/GoogleMapsLibraryContext.tsx";
import GoogleMapsRouteContext from "../islands/GoogleMapsRouteContext.tsx";

const mqttConfig: MqttBikeTelemetryConfig = {
  url: Deno.env.get("MQTT_BROKER_URL")!,
  username: Deno.env.get("MQTT_BROKER_USERNAME")!,
  password: Deno.env.get("MQTT_BROKER_PASSWORD")!,
};

const API_KEY = Deno.env.get("GOOGLE_MAP_API_KEY")!;
const MAP_ID = Deno.env.get("GOOGLE_MAP_ID")!;

export default function Home() {
  if (mqttConfig.url && mqttConfig.username && mqttConfig.password) {
    if (!mqttBikeTelemetryConfig.value) {
      console.log("[mqtt] Connecting MQTT");
      if (IS_BROWSER) {
        const urlBase = new URL(mqttConfig.url);
        urlBase.protocol = "ws:";
        urlBase.port = "1884";
        mqttConfig.url = urlBase.toString();
      }
      mqttBikeTelemetryConfig.value = mqttConfig;
      connectBikeTelemetry(mqttConfig);
    }
  } else console.log("[mqtt] Missing MQTT configuration");

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
          streetView={false}
          streetViewLinks={streetViewLinks}
        >
        </GoogleMap>
      </GoogleMapsRouteContext>
    </GoogleMapsLibraryContext>
  );
}
