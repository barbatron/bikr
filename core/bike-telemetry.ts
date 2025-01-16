import { IS_BROWSER } from "$fresh/runtime.ts";
import { Buffer } from "node:buffer";
import mqtt from "npm:mqtt";
import { BehaviorSubject, map, Subject } from "npm:rxjs";
import { filter, mergeWith } from "npm:rxjs/operators";
import { merge } from "rxjs";

const url = IS_BROWSER
  ? "mqtt://homeassistant.saltet.jolsson.info:1884"
  : "mqtt://homeassistant.saltet.jolsson.info:1883";

const client = mqtt.connect(url, {
  username: "bikr",
  password: "abc123",
});

const speedTopic = "homeassistant/sensor/spinboi_speed/state";

client.on("connect", () => {
  console.log("connected");
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
  console.error("error", err);
});

const messageSource = new Subject<[string, Buffer]>();
client.on(
  "message",
  (topic, message) => void messageSource.next([topic, message]),
);

const manualStream = new BehaviorSubject<number>(0);

export const speedStream = messageSource.pipe(
  filter(([topic]) => topic === speedTopic),
  map(([_, message]) => parseFloat(message.toString())),
  mergeWith(manualStream.asObservable()),
);

export const triggerSpeed = (speedKph: number) => {
  manualStream.next(speedKph);
};
