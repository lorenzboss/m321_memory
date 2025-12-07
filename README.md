[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/jJjjf4zV)

# Development Server

## Environment Variables Setup

Copy the .env.example file to the .env and modify it with your actual values:

```bash
cp .env.example .env
```

Then edit `.env` with your secure values:

- `POSTGRES_PASSWORD`: Secure password for PostgreSQL database
- `JWT_SECRET`: Strong secret key for JWT token signing (use a long, random string)

## Application

Run the following command to start all services using Docker Compose:

```bash
docker compose up -d
```

To stop the services, use:

```bash
docker compose down
```

## Available Ports

After starting the application, the following services will be available:

- **Frontend (React App)**: http://localhost:3000
- **Game Service**: http://localhost:8001
- **Authentication Service**: http://localhost:8002
- **Stats Service**: http://localhost:8003
- **Database Administration (Adminer)**: [http://localhost:8080...](http://localhost:8080/?pgsql=postgres-db&username=postgres&db=memory_game_db)
- **PostgreSQL Database**: http://localhost:5432

# Architecture & Functionality

This project is a distributed multiplayer memory game.  
Multiple Dockerized services communicate via HTTP, WebSockets, PostgreSQL, and MQTT.

## Architecture Overview

<img width="1600" height="1327" alt="image" src="https://github.com/user-attachments/assets/63dc7c4c-b8c6-4945-b698-816c0104a043" />

## All Services

**Frontend Webserver:**  
Displays the user interface and maintains a WebSocket connection to the Game Service.

**Game Service:**  
Handles core game logic and real-time gameplay. Communicates via MQTT and WebSockets.

**Stats Service:**  
Manages and stores player statistics. Subscribes to MQTT events and provides REST API for statistics queries.

**Log Service:**  
Receives game and statistics logs via MQTT and writes them to local JSON log files. Internal service with no HTTP interface.

**Authentication Service (Container, zix99/simple-auth):**  
Handles user management, login, and registration. Issues JSON Web Tokens (JWT) and stores user data in the PostgreSQL database.

**MQTT Broker (Container, eclipse-mosquitto):**  
Message broker for event-driven communication between services.

**PostgreSQL Database (Container, postgres):**  
Stores authentication and player statistics data.

**Adminer (Container, adminer):**  
Web-based database administration interface for PostgreSQL.

## Technology Stack

- **Frontend / UI:** React, TypeScript, CSS, WebSockets
- **Backend / Services:** Node.js (TypeScript) – Game, Stats, and Logging Services
- **Messaging / Broker:** MQTT Broker
- **Database:** PostgreSQL
- **Authentication:** simple-auth (JWT-based sessions)
- **Logging:** File-based logs handled by the Logging Service

## How It Works

1. **Login:** Auth Service issues JWT → stored as cookie in frontend
2. **Game Setup:** Player creates/joins game with 4-digit code → WebSocket connection established
3. **Real-time Play:** Socket.IO broadcasts game state changes between players
4. **Event Publishing:** Game Service publishes events via MQTT:
   - `game/{id}/start`, `game/{id}/move`, `game/{id}/end`
5. **Data Processing:**
   - Stats Service updates player statistics in PostgreSQL
   - Log Service saves all events as JSON files
