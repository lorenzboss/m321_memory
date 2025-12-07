import * as mqtt from 'mqtt';

interface GameStartEvent {
  matchId: string;
  players: string[];
  timestamp: string;
}

interface GameMoveEvent {
  matchId: string;
  player: string;
  flippedCard1: number;
  flippedCard2: number;
  match: boolean;
  remainingPairs: number;
  timestamp: string;
}

interface GameEndEvent {
  matchId: string;
  winner: string;
  playerStats: Array<{
    username: string;
    score: number;
    time: number;
  }>;
  duration: number;
  timestamp: string;
}

export class MqttService {
  private client: mqtt.MqttClient | null = null;
  private isConnected = false;

  constructor() {
    this.connect();
  }

  private connect(): void {
    try {
      const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
      console.log(`Connecting to MQTT broker at: ${brokerUrl}`);

      this.client = mqtt.connect(brokerUrl, {
        clientId: `game-service-${Date.now()}`,
        keepalive: 30,
        reconnectPeriod: 5000,
        connectTimeout: 10000,
      });

      this.client.on('connect', () => {
        console.log('Connected to MQTT broker');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        console.error('MQTT connection error:', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('MQTT connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnect', () => {
        console.log('Reconnecting to MQTT broker...');
      });
    } catch (error) {
      console.error('Failed to connect to MQTT broker:', error);
      this.isConnected = false;
    }
  }

  public publishGameStart(event: GameStartEvent): void {
    if (!this.isConnected || !this.client) {
      return;
    }

    const topic = `game/${event.matchId}/start`;
    const payload = JSON.stringify(event);

    this.client.publish(topic, payload, { qos: 1 }, (error) => {
      if (error) {
        console.error('Failed to publish game start event:', error);
      }
    });
  }

  public publishGameMove(event: GameMoveEvent): void {
    if (!this.isConnected || !this.client) {
      return;
    }

    const topic = `game/${event.matchId}/move`;
    const payload = JSON.stringify(event);

    this.client.publish(topic, payload, { qos: 1 }, (error) => {
      if (error) {
        console.error('Failed to publish game move event:', error);
      }
    });
  }

  public publishGameEnd(event: GameEndEvent): void {
    if (!this.isConnected || !this.client) {
      return;
    }

    const topic = `game/${event.matchId}/end`;
    const payload = JSON.stringify(event);

    this.client.publish(topic, payload, { qos: 1 }, (error) => {
      if (error) {
        console.error('Failed to publish game end event:', error);
      }
    });
  }

  public disconnect(): void {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
    }
  }
}

// Singleton Instance
export const mqttService = new MqttService();
