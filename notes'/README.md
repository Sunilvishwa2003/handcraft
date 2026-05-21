# MahabsCrafto

Full-stack monorepo project.

## Structure

- `frontend/` → Next.js frontend
- `backend/` → Express.js backend

## Root package

The root `package.json` is minimal and routes commands into the `frontend/` and `backend/` workspaces.

## Local development

1. Install dependencies for each workspace:
   - `cd frontend && npm install`
   - `cd backend && npm install`

2. Start the frontend app:
   - `npm run frontend:dev`

3. Start the backend app:
   - `npm run backend:dev`

## Build commands

- Frontend production build:
  - `npm run frontend:build`
- Backend build:
  - `npm run backend:build`

## Docker Compose

Use Docker Compose to run the frontend, backend, and MongoDB together.

```bash
docker compose up --build
```

Service ports:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5001`
- MongoDB: `mongodb://localhost:27017`

## Notes

- The frontend service is built from `./frontend/Dockerfile`.
- The backend service is built from `./backend/Dockerfile`.
- `NEXT_PUBLIC_API_URL` is configured for local development to point at `http://localhost:5001/api`.
