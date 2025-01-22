import { IS_BROWSER } from "$fresh/runtime.ts";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import mqtt from "npm:mqtt";
import { BehaviorSubject, map, merge, Subject } from "npm:rxjs";
import { filter } from "npm:rxjs/operators";

const urlBase = new URL(Deno.env.get("MQTT_BROKER_URL")!);
urlBase.port = IS_BROWSER
  ? "1884" // websockets from browser
  : "1883"; // something else from server
const url = urlBase.toString();

const client = mqtt.connect(url, {
  username: Deno.env.get("MQTT_USERNAME")!,
  password: Deno.env.get("MQTT_PASSWORD")!,
});

const speedTopic = "homeassistant/sensor/spinboi_speed/state";

client.on("connect", () => {
  console.log("[biketel] connected");
  client.subscribe(speedTopic, (err) => {
    if (!err) {
      // client.publish("presence", "Hello mqtt");
      console.log(`subscribed to ${speedTopic}`);
    } else {
      console.error("error subscribing", err);
    }
  });
});

client.on("error", (err) => {
  console.error("[biketel] error", err);
});

const messageSource = new Subject<[string, Buffer]>();
client.on(
  "message",
  (topic, message) => void messageSource.next([topic, message]),
);

const manualSpeedSource = new BehaviorSubject<number>(0);

const bikeSpeedSource = messageSource.pipe(
  filter(([topic]) => topic === speedTopic),
  map(([_, message]) => parseFloat(message.toString())),
);

export const speedSourceKph = merge(bikeSpeedSource, manualSpeedSource).pipe(
  filter((speed) => {
    const isValid = speed >= 0 && speed < 100;
    if (!isValid) {
      console.warn("[biketel] Rejecting crazy speed", speed);
      return false;
    }
    return true;
  }),
);

export const triggerSpeed = (speedKph: number) => {
  console.log("[biketel] triggerSpeed", speedKph);
  manualSpeedSource.next(speedKph);
};
