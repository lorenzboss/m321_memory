import mqtt, { IClientOptions, MqttClient } from "mqtt";
import { PlayerMatchStats, upsertUserStatsForMatch } from "./StatsRepository";

interface GameEndEventPayload {
  matchId: string;
  winner: string;
  playerStats: Array<{
    username: string;
    score: number;
    time?: number;
  }>;
  duration: number;
  timestamp: string;
}

export class MqttSubscriber {
  private client: MqttClient | null = null;

  constructor(private readonly topicPattern = "game/+/end") {
    this.connect();
  }

  private connect(): void {
    const brokerUrl = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";

    const options: IClientOptions = {
      clientId: `stats-service-${Date.now()}`,
      keepalive: 30,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    };

    this.client = mqtt.connect(brokerUrl, options);

    this.client.on("connect", () => {
      console.log("Stats service connected to MQTT broker.");
      this.subscribeToTopics();
    });

    this.client.on("error", (error: Error) => {
      console.error("MQTT connection error:", error);
    });

    this.client.on("reconnect", () => {
      console.log("Reconnecting to MQTT broker...");
    });

    this.client.on("close", () => {
      console.log("MQTT connection closed.");
    });

    this.client.on("message", (topic: string, payload: Buffer) => {
      this.handleMessage(topic, payload);
    });
  }

  private subscribeToTopics(): void {
    if (!this.client) {
      return;
    }

    this.client.subscribe(
      this.topicPattern,
      { qos: 1 },
      (error: Error | null) => {
        if (error) {
          console.error("Failed to subscribe to topic:", error);
        } else {
          console.log(`Subscribed to topic pattern: ${this.topicPattern}`);
        }
      },
    );
  }

  private handleMessage(topic: string, payload: Buffer): void {
    try {
      const message: GameEndEventPayload = JSON.parse(payload.toString());
      this.processGameEndMessage(topic, message).catch((error) => {
        console.error("Failed to process game end message:", error);
      });
    } catch (error) {
      console.error("Failed to parse MQTT payload:", error);
    }
  }

  private async processGameEndMessage(
    topic: string,
    message: GameEndEventPayload,
  ): Promise<void> {
    if (!message.matchId || !Array.isArray(message.playerStats)) {
      console.warn(`Received invalid game end message on topic ${topic}`);
      return;
    }

    const matchDuration = Number.isFinite(message.duration)
      ? message.duration
      : 0;

    const updates: Promise<unknown>[] = message.playerStats
      .filter((player) => Boolean(player.username))
      .map((player) => {
        const playerScore = Number.isFinite(player.score) ? player.score : 0;

        const playerStats: PlayerMatchStats = {
          username: player.username,
          score: playerScore,
          matchDuration,
          isWinner: player.username === message.winner,
        };

        return upsertUserStatsForMatch(playerStats);
      });

    await Promise.all(updates);
    console.log(
      `Processed match ${message.matchId}, updated ${updates.length} player stats.`,
    );
  }
}
