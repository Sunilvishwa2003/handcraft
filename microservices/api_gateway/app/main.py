from fastapi import FastAPI

from shared.app.core.config import service_metadata


SERVICE_MAP = {
    "catalog": "http://catalog-service:8001",
    "user": "http://user-service:8002",
    "cart-order": "http://cart-order-service:8003",
    "payment": "http://payment-service:8004",
    "inventory": "http://inventory-service:8005",
    "ai": "http://ai-service:8006",
    "media": "http://media-service:8007",
}

app = FastAPI(
    title="Amazon-Like Commerce API Gateway",
    version="1.0.0",
    summary="Edge gateway for the microservice platform built on top of the existing e-commerce project.",
)


@app.get("/")
def root():
    return {
        "platform": "ai-powered-ecommerce",
        "architecture": "fastapi-microservices",
        "services": SERVICE_MAP,
        "current_repo_mode": "hybrid-migration-from-node-monolith",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "gateway": service_metadata(
            "api-gateway",
            8000,
            [
                "route external traffic",
                "stabilize frontend contracts",
                "provide a single ingress point",
            ],
        ),
        "upstreams": SERVICE_MAP,
    }


@app.get("/topology")
def topology():
    return {
        "service_edges": [
            "gateway -> catalog",
            "gateway -> user",
            "gateway -> cart-order",
            "gateway -> payment",
            "gateway -> inventory",
            "gateway -> ai",
            "gateway -> media",
        ],
        "storage": ["mongodb", "redis", "elasticsearch", "s3_or_cloudinary", "cdn"],
        "event_bus": "kafka_optional",
    }
