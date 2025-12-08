# Multiplayer Memory Game

A multiplayer memory game built with TypeScript, React, and Socket.io.

## Local Development

### Prerequisites

- Node.js (v18+)
- PostgreSQL database

### Start Backend

```bash
cd backend
npm install
cp .env.example .env  # Configure environment variables
npm run dev
```

Backend runs on `http://localhost:8000`.

### Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

### Environment Variables (Backend)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/memory
JWT_SECRET=your-secret-key
PORT=8000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## Deployment

- **Backend**: Digital Ocean App Platform (auto-deploys from `main` branch)
  - URL: https://memory-api.lorenzboss.com
  - Dockerfile-based deployment from `backend/`
- **Frontend**: Vercel (auto-deploys from `main` branch)
  - URL: https://memory.lorenzboss.com

### Configure Secrets

Set `DATABASE_URL` and `JWT_SECRET` as secrets in Digital Ocean App Platform.
