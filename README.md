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

## Deploy on EC2

1. SSH into your EC2 instance.
2. Install Docker and Docker Compose plugin.
3. Clone this repository on the server.
4. Copy `.env.prod.example` to `.env.prod` and replace placeholder values.
5. Run:
   - `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`
6. Check services:
   - frontend: `http://YOUR_EC2_PUBLIC_IP`
   - backend: `http://YOUR_EC2_PUBLIC_IP:5000/health`
   - n8n: `http://YOUR_EC2_PUBLIC_IP:5678`

### Minimal EC2 bootstrap

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

### Deploy commands

```bash
git clone <REPO_URL> styleflow
cd styleflow
cp .env.prod.example .env.prod
nano .env.prod
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### Notes for production

- `docker-compose.yml` is for local development.
- `docker-compose.prod.yml` removes source bind mounts and runs backend/frontend in production mode.
- `n8n` uses a Docker named volume in production to avoid host permission issues.
- Do not expose Postgres or Redis publicly in EC2 security groups.

## Notes

- `mobile-app/.git` can be removed if you want a single root repository.
- Keep secrets only in `.env` and never commit them.
