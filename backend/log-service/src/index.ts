import { LogRepository } from "./services/LogRepository";
import { MqttSubscriber } from "./services/MqttSubscriber";

console.log("🚀 Log Service started successfully!");

const logRepository = new LogRepository(
  process.env.LOG_DIRECTORY || "/app/logs",
);
const mqttSubscriber = new MqttSubscriber(logRepository);

const gracefulShutdown = () => {
  console.log("🛑 Shutting down gracefully...");
  mqttSubscriber.disconnect();
  process.exit(0);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  gracefulShutdown();
});
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
  gracefulShutdown();
});
