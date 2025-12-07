import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { authMiddleware } from './middleware/auth';
import authRouter from './routes/auth';
import healthRouter from './routes/health';
import statsRouter from './routes/stats';
import { SocketHandler } from './socket/SocketHandler';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 8001;

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: [
      `http://${process.env.EXTERNAL_HOST || 'localhost'}:${process.env.FRONTEND_PORT || '3000'}`,
      `http://${process.env.FRONTEND_HOST || 'frontend'}:${process.env.FRONTEND_PORT || '3000'}`,
    ],
    credentials: true,
  },
  allowEIO3: true,
});

// Middlewares
app.use(
  cors({
    origin: [
      `http://${process.env.EXTERNAL_HOST || 'localhost'}:${process.env.FRONTEND_PORT || '3000'}`,
      `http://${process.env.EXTERNAL_HOST || 'localhost'}:${process.env.AUTH_SERVICE_PORT || '8002'}`,
    ], // Allow both frontend and auth service
    credentials: true, // Important for cookies
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply authentication middleware globally
app.use(authMiddleware);

// Routes
app.use(healthRouter);
app.use(authRouter);
app.use(statsRouter);

// Socket.IO connection handling
const socketHandler = new SocketHandler(io);
io.on('connection', (socket) => {
  socketHandler.handleConnection(socket);
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Game service listening on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
});
