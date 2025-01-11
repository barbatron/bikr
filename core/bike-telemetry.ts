import mqtt from "mqtt";
import { Buffer } from "node:buffer";
import { map, Subject } from "rxjs";
import { filter } from "rxjs/operators";

const client = mqtt.connect("mqtt://homeassistant.saltet.jolsson.info:1883", {
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

export const speedStream = messageSource.pipe(
  filter(([topic]) => topic === speedTopic),
  map(([_, message]) => parseFloat(message.toString())),
);

// messageSource.subscribe((args) => {
//   // const [topic, message] = args;
//   console.log("Message", args);
// });
