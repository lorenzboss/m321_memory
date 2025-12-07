import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

// Globale Socket-Instanz
let globalSocket: Socket | null = null;

export const useSocket = (): Socket | null => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Verhindere mehrfache Initialisierung
    if (isInitialized.current && globalSocket) {
      setSocket(globalSocket);
      return;
    }

    if (!globalSocket) {
      // WebSocket URL aus Umgebungsvariablen
      const socketUrl =
        process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

      console.log("Creating new WebSocket connection to:", socketUrl);

      globalSocket = io(socketUrl, {
        withCredentials: true,
        transports: ["websocket", "polling"],
        autoConnect: true,
      });

      globalSocket.on("connect", () => {
        console.log("Connected to WebSocket server");
      });

      globalSocket.on("disconnect", (reason) => {
        console.log("Disconnected from WebSocket server:", reason);
      });

      globalSocket.on("connect_error", (error) => {
        console.error("WebSocket connection error:", error);
      });
    }

    setSocket(globalSocket);
    isInitialized.current = true;

    return () => {
      // Verbindung nicht trennen, nur den lokalen State cleanen
      // Die globale Socket-Verbindung bleibt bestehen
    };
  }, []);

  return socket;
};
