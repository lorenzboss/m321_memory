import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { initializeDatabase, initSchema } from "./db";
import { authMiddleware } from "./middleware/auth";
import authRouter from "./routes/auth";
import healthRouter from "./routes/health";
import statsRouter from "./routes/stats";
import { SocketHandler } from "./socket/SocketHandler";

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT;

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "https://memory.lorenzboss.com",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
  allowEIO3: true,
});

// Middlewares
// Permissive CORS - allow all origins with credentials
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS,PATCH"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type,Authorization,Cookie,X-Requested-With,Accept"
    );
    res.header("Access-Control-Expose-Headers", "Set-Cookie");
    res.header("Access-Control-Max-Age", "86400");
  }

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use(healthRouter);
app.use(authRouter);
app.use(authMiddleware);
app.use(statsRouter);

// Socket.IO connection handling
const socketHandler = new SocketHandler(io);
io.on("connection", (socket) => {
  socketHandler.handleConnection(socket);
});

async function bootstrap() {
  try {
    // Initialize database
    initializeDatabase();
    await initSchema();
    console.log("Database initialized successfully");

    // Start server
    server.listen(PORT, () => {
      console.log(`Backend service listening on port ${PORT}`);
      console.log(`WebSocket server ready for connections`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();
