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
4. Ensure your reverse proxy and DNS are configured first.
5. Copy `.env.prod.example` to `.env.prod` and replace placeholder values if needed.
6. Run:
   - `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`
7. Check services:
   - frontend: `https://ecloria.co.uk`
   - backend: `https://api.ecloria.co.uk/health`
   - n8n: `https://n8n.ecloria.co.uk`

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

## GitHub Actions CD

The repository now supports a minimal CD flow on `push` to `main`.

How it works:

1. CI jobs must pass:
   - backend
   - frontend
   - mobile
   - docker compose validation
2. If all pass, GitHub Actions SSHes into the server.
3. The server runs:
   - `git fetch origin`
   - `git checkout <branch>`
   - `git pull --ff-only origin <branch>`
   - `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`
   - `docker image prune -f`

Required GitHub repository secrets:

- `DEPLOY_HOST`
  - example: `15.134.229.29`
- `DEPLOY_USER`
  - example: `ubuntu`
- `DEPLOY_PATH`
  - example: `/home/ubuntu/styleflow`
- `DEPLOY_SSH_PRIVATE_KEY`
  - private key that can SSH into the server
- `DEPLOY_BRANCH`
  - recommended: `main`

Important assumptions:

- the repository is already cloned on the server at `DEPLOY_PATH`
- `.env.prod` already exists on the server
- the server user can run Docker Compose without interactive sudo
- the checked-out branch on the server tracks the same Git remote

Recommended first test:

1. add the required repository secrets
2. merge a small change into `main`
3. watch the `deploy` job in GitHub Actions
4. verify:
   - `https://api.ecloria.co.uk/health`
   - `https://ecloria.co.uk`

### Notes for production

- `docker-compose.yml` is for local development.
- `docker-compose.prod.yml` removes source bind mounts and runs backend/frontend in production mode.
- `n8n` uses a Docker named volume in production to avoid host permission issues.
- Do not expose Postgres or Redis publicly in EC2 security groups.
- Recommended host routing:
  - `ecloria.co.uk` -> frontend on `127.0.0.1:3000`
  - `api.ecloria.co.uk` -> backend on `127.0.0.1:5000`
  - `n8n.ecloria.co.uk` -> n8n on `127.0.0.1:5678`
- If you change `VITE_API_BASE_URL`, rebuild the frontend image because Vite bakes it into the production bundle.

## Notes

- `mobile-app/.git` can be removed if you want a single root repository.
- Keep secrets only in `.env` and never commit them.
