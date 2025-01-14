import mqtt, { MqttClient } from "mqtt";
import { Buffer } from "node:buffer";
import { Observable, Subject } from "rxjs";

export type MqttConfig = {
  brokerUrl: string;
  username: string;
  password: string;
};

export function createMqttClientSource(
  config: Observable<MqttConfig>,
): Observable<MqttClient> {
  const subject = new Subject<MqttClient>();
  config.subscribe(async (config) => {
    console.log("[mqtt] got config, create mqtt client", config);
    const client = await mqtt.connectAsync(config.brokerUrl, {
      username: config.username,
      password: config.password,
    });
    client.on("connect", () => {
      console.log("[mqtt] client connected");
      subject.next(client);
    });
    client.on("error", (err) => {
      console.warn("[mqtt] client error", err);
      subject.error(err);
    });
    client.on("close", () => {
      console.log("[mqtt] client closed");
      subject.complete();
    });
  });
  return subject.asObservable();
}

export class MqttSubscriber {
  public constructor(private readonly clientSource: Observable<MqttClient>) {
  }

  public subscribeTopic<TMessage>(topic: string): Observable<TMessage> {
    console.log(`[mqtt: ${topic}] subscribe`);
    return new Observable<TMessage>((subscriber) => {
      console.log(`[mqtt: ${topic}] got subscriber`);
      this.clientSource.subscribe(async (client) => {
        console.log(`[mqtt: ${topic}] subscribe: got client`);
        const [sub] = await client.subscribeAsync(topic);
        console.log(`[mqtt: ${topic}] subscribe: subscribed`, sub);
        const messageHandler = (
          messageTopic: string | string[],
          message: Buffer,
        ) => {
          if (messageTopic !== topic) return;
          const messageStr = message.toString();
          // console.log(`[mqtt: ${topic}] message`, messageStr);
          try {
            const messageObj = JSON.parse(messageStr) as TMessage;
            subscriber.next(messageObj);
          } catch (err) {
            console.warn(`[mqtt: ${topic}] error parsing message`, err);
            subscriber.error(err);
          }
        };
        // Can't use rxjs fromEvent, maybe mqtt client doesn't implement standard js events
        client.on("message", messageHandler);
        return () => {
          console.log(`[mqtt: ${topic}] unsubscribe`);
          client.unsubscribe(topic);
        };
      });
    });
  }
}
