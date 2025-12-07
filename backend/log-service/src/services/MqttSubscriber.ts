import * as mqtt from "mqtt";
import { GameEndEvent, GameMoveEvent, GameStartEvent } from "../types/game";
import { LogRepository } from "./LogRepository";

export class MqttSubscriber {
  private client: mqtt.MqttClient | null = null;
  private isConnected = false;
  private logRepository: LogRepository;

  constructor(logRepository: LogRepository) {
    this.logRepository = logRepository;
    this.connect();
  }

  private connect(): void {
    try {
      const brokerUrl = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
      console.log(`🔌 Connecting to MQTT broker at: ${brokerUrl}`);

      this.client = mqtt.connect(brokerUrl, {
        clientId: `log-service-${Date.now()}`,
        keepalive: 30,
        reconnectPeriod: 5000,
        connectTimeout: 10000,
      });

      this.client.on("connect", () => {
        console.log("✅ Connected to MQTT broker");
        this.isConnected = true;
        this.subscribeToTopics();
      });

      this.client.on("error", (error) => {
        console.error("❌ MQTT connection error:", error);
        this.isConnected = false;
      });

      this.client.on("close", () => {
        console.log("🔌 MQTT connection closed");
        this.isConnected = false;
      });

      this.client.on("message", (topic, message) => {
        this.handleMessage(topic, message);
      });
    } catch (error) {
      console.error("❌ Failed to connect to MQTT broker:", error);
      this.isConnected = false;
    }
  }

  private subscribeToTopics(): void {
    if (!this.client || !this.isConnected) return;

    const topics = ["game/+/start", "game/+/move", "game/+/end"];
    topics.forEach((topic) => {
      this.client!.subscribe(topic, { qos: 1 });
    });
  }

  private handleMessage(topic: string, message: Buffer): void {
    try {
      const data = JSON.parse(message.toString());
      if (topic.endsWith("/start")) {
        this.handleGameStart(data as GameStartEvent);
      } else if (topic.endsWith("/move")) {
        this.handleGameMove(data as GameMoveEvent);
      } else if (topic.endsWith("/end")) {
        this.handleGameEnd(data as GameEndEvent);
      }
    } catch (error) {
      console.error("❌ Error processing MQTT message:", error);
    }
  }

  private handleGameStart(event: GameStartEvent): void {
    this.logRepository.logGameStart(event);
  }

  private handleGameMove(event: GameMoveEvent): void {
    this.logRepository.logGameMove(event);
  }

  private handleGameEnd(event: GameEndEvent): void {
    this.logRepository.logGameEnd(event);
  }

  public disconnect(): void {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
      console.log("🔌 MQTT client disconnected");
    }
  }
}
