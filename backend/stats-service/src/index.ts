import cors from "cors";
import express, { Express } from "express";
import { initializeDatabase } from "./db";
import healthRouter from "./routes/health";
import statsRouter from "./routes/stats";
import { MqttSubscriber } from "./services/MqttSubscriber";

async function bootstrap(): Promise<void> {
  try {
    await initializeDatabase();
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }

  const app: Express = express();
  const port = Number(process.env.PORT || 8003);

  const defaultOrigins = ["http://localhost:8001", "http://game-service:8001"];
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((origin: string) =>
        origin.trim(),
      )
    : defaultOrigins;

  const allowedOriginSet = new Set(allowedOrigins.filter(Boolean));

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        if (allowedOriginSet.has(origin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
      credentials: true,
    }),
  );

  app.use(express.json());
  app.use(healthRouter);
  app.use(statsRouter);

  app.listen(port, () => {
    console.log(`Stats service listening on port ${port}`);
  });

  new MqttSubscriber();
}

void bootstrap();
