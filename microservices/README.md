# AI-Powered E-Commerce Microservices Blueprint

This folder evolves the current marketplace into an Amazon-inspired architecture without deleting the existing `frontend/` and `backend/` code.

The current repository still contains:

- `frontend/` for the customer and admin UI
- `backend/` for the existing Express + MongoDB implementation

This `microservices/` folder adds the next-stage platform blueprint:

- FastAPI-based service boundaries
- AI/ML service scaffolding
- infrastructure orchestration for MongoDB, Redis, Elasticsearch, and optional Kafka
- architecture documentation for final-year project presentation and implementation

## Service Map

- `api_gateway/` - single entry point, routing map, and health aggregation
- `catalog_service/` - product upload, update, retrieval, semantic-search handoff, and indexing contract
- `user_service/` - JWT-based registration, login, profile, and identity ownership
- `cart_order_service/` - carts, checkout orchestration, order creation, and order state
- `payment_service/` - payment authorization, fraud scoring integration, and payment lifecycle
- `inventory_service/` - stock reservation, low-stock alerts, demand forecast, and delivery timeline
- `ai_service/` - recommendations, semantic search, personalization, fraud scoring, and forecasting
- `media_service/` - image upload contracts, object-storage integration, CDN-ready asset delivery, and media metadata confirmation
- `shared/` - shared schemas, algorithms, and infrastructure configuration

## Why This Fits The Existing Project

The current backend already has:

- product, user, order, cart, notification, and behavior models
- a basic AI service for search, recommendation, fraud detection, and pricing
- an admin panel and user-facing storefront

This blueprint keeps those domain ideas and reorganizes them into service boundaries that are easier to scale and explain in a real-world architecture review.

## Suggested Migration Path

1. Keep the current Next.js frontend as the presentation layer.
2. Gradually replace the Node monolith endpoints with FastAPI services behind an API gateway.
3. Move search reads to Elasticsearch.
4. Move hot cart/session data to Redis.
5. Move AI inference and analytics into the dedicated AI service.
6. Introduce Kafka only when asynchronous workflows need decoupling.

## Local Structure

```text
microservices/
  api_gateway/
  ai_service/
  media_service/
  catalog_service/
  cart_order_service/
  inventory_service/
  payment_service/
  shared/
  user_service/
  ARCHITECTURE.md
  docker-compose.yml
  Dockerfile
  requirements.txt
```

## Run Shape

The services are designed to run from the `microservices/docker-compose.yml` stack:

```bash
docker compose -f microservices/docker-compose.yml up --build
```

Default ports:

- `8000` - API gateway
- `8001` - catalog service
- `8002` - user service
- `8003` - cart/order service
- `8004` - payment service
- `8005` - inventory service
- `8006` - AI service
- `8007` - media service
- `27017` - MongoDB
- `6379` - Redis
- `9200` - Elasticsearch

Optional Kafka services are placed behind the `streaming` profile.

## Final-Year Project Positioning

This design is intentionally strong enough for:

- system design viva explanations
- cloud deployment discussion
- AI/ML module demonstration
- scalability and reliability justification
- modular implementation by multiple teammates

Read [ARCHITECTURE.md](./ARCHITECTURE.md) for the full high-level design, low-level flow, module explanations, and algorithms.
For the production-grade React + FastAPI + object-storage design, read [PRODUCTION_ECOMMERCE_ARCHITECTURE.md](./PRODUCTION_ECOMMERCE_ARCHITECTURE.md).
