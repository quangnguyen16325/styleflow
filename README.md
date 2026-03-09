# Order App Base
- `backend` (Node.js + Express)
- `frontend-web` (React + Vite)
- `mobile-app` (Expo + React Native)
- `docker-compose.yml` (db, redis, backend, frontend)

## Current scope
- Kept only minimal skeleton APIs/screens to start new implementation.

## Run local (without Docker)
1. `npm install --prefix backend`
2. `npm install --prefix frontend-web`
3. `npm install --prefix mobile-app`
4. Start services:
   - Backend: `npm run dev:backend`
   - Web: `npm run dev:web`
   - Mobile: `npm run dev:mobile`

## Run with Docker
1. Ensure `.env` exists at repo root.
2. Run `docker compose up -d --build`
3. Backend health check: `http://localhost:5000/health`

## Notes
- `mobile-app/.git` can be removed if you want a single root repository.
- Keep secrets only in `.env` and never commit them.
