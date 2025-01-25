import { signal } from "@preact/signals-core";
import { Buffer } from "node:buffer";
import mqtt from "npm:mqtt";
import { BehaviorSubject, map, merge, Subject } from "npm:rxjs";
import { filter } from "npm:rxjs/operators";

export type MqttBikeTelemetryConfig = {
  url: string;
  username: string;
  password: string;
};

export const mqttBikeTelemetryConfig = signal<
  MqttBikeTelemetryConfig | undefined
>(undefined);

const speedTopic = "homeassistant/sensor/spinboi_speed/state";

const messageSource = new Subject<[string, Buffer]>();
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

export function connectBikeTelemetry(
  { url, username, password }: MqttBikeTelemetryConfig,
) {
  const client = mqtt.connect(url, {
    username,
    password,
  });

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

  client.on(
    "message",
    (topic, message) => void messageSource.next([topic, message]),
  );
}
