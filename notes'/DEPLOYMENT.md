# Deployment Guide

This repository is a monorepo with two applications:

- `frontend` - Next.js app
- `backend` - Express + MongoDB API

## Recommended production stack

- Frontend: Vercel (free tier)
- Backend: Render free-tier web service
- Database: MongoDB Atlas free tier
- CI/CD: GitHub Actions

## Environment variables

### Backend (`backend/.env`)

```
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/<dbname>?retryWrites=true&w=majority
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=30d
CLIENT_URL=https://your-frontend-url.vercel.app
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
PORT=5001
NODE_ENV=production
```

### Frontend (`frontend/.env`)

```
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api
NEXT_PUBLIC_URL=https://your-frontend-url.vercel.app
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id
```

## GitHub Actions CI

A workflow has been added at `.github/workflows/ci-cd.yml`.

It performs:

- frontend dependency install
- frontend build
- frontend lint
- backend dependency install
- backend test

It also contains an optional manual Vercel deploy step when the following GitHub secrets are configured:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Vercel deployment

1. Create a Vercel account and link your GitHub repository.
2. Set the project root to `frontend`.
3. Configure environment variables in Vercel using the values from `frontend/.env.example`.
4. Set `NEXT_PUBLIC_API_URL` to your backend URL with `/api` appended.

## Render deployment

1. Create a Render account and link your GitHub repository.
2. Use the `render.yaml` manifest to define two services: frontend and backend.
3. Set the environment variables in Render based on `backend/.env.example` and `frontend/.env.example`.

## MongoDB Atlas setup

1. Create an Atlas cluster on the free tier.
2. Add a database user and whitelist your app IPs or allow access from anywhere during setup.
3. Use the connection string in `MONGO_URI`.

## Quick start locally

- Frontend: `cd frontend && npm install && npm run dev`
- Backend: `cd backend && npm install && npm run dev`

## Notes

- The frontend uses `NEXT_PUBLIC_API_URL` to point to the backend API.
- The backend uses `CLIENT_URL` to enable CORS for the frontend.
- `frontend/next.config.ts` rewrites `/uploads/*` to the backend uploads endpoint.
