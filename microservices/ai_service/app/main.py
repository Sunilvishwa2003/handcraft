from collections import defaultdict

from fastapi import FastAPI

from shared.app.core.config import service_metadata, settings
from shared.app.schemas.ai import BehaviorEvent, DemandForecastRequest, FraudCheckRequest, RecommendationRequest, SemanticSearchRequest
from shared.app.services.forecasting import demand_forecast
from shared.app.services.fraud import compute_fraud_score
from shared.app.services.recommendations import hybrid_recommendations
from shared.app.services.search import SemanticSearchEngine


app = FastAPI(title="AI Service", version="1.0.0")
search_engine = SemanticSearchEngine(settings.search_embedding_model)

DEFAULT_CATALOG = [
    {
        "sku": "HC-001",
        "name": "Handwoven Cane Basket",
        "description": "Eco-friendly storage basket for living rooms and gifting.",
        "brand": "Handcrafts",
        "category": "Home Decor",
        "tags": ["eco-friendly", "woven", "storage"],
        "semantic_keywords": ["gift", "basket", "natural"],
        "availability": "in-stock",
        "purchases": 120,
        "views": 1240,
    },
    {
        "sku": "HC-002",
        "name": "Brass Diya Set",
        "description": "Festival-ready brass diya set for pooja and decor.",
        "brand": "Heritage Glow",
        "category": "Festival Decor",
        "tags": ["brass", "pooja", "festive"],
        "semantic_keywords": ["festival", "gift", "home decor"],
        "availability": "in-stock",
        "purchases": 210,
        "views": 2100,
    },
    {
        "sku": "HC-003",
        "name": "Macrame Plant Hanger",
        "description": "Boho hanging planter made with hand-knotted cotton rope.",
        "brand": "Handcrafts",
        "category": "Home Decor",
        "tags": ["boho", "cotton", "plant"],
        "semantic_keywords": ["decor", "natural", "living room"],
        "availability": "in-stock",
        "purchases": 90,
        "views": 980,
    },
]

DEFAULT_INTERACTIONS = [
    {"user_id": "user-1", "product_id": "HC-001", "event_type": "view"},
    {"user_id": "user-1", "product_id": "HC-001", "event_type": "cart"},
    {"user_id": "user-2", "product_id": "HC-001", "event_type": "purchase"},
    {"user_id": "user-2", "product_id": "HC-003", "event_type": "purchase"},
    {"user_id": "user-3", "product_id": "HC-002", "event_type": "purchase"},
    {"user_id": "user-3", "product_id": "HC-003", "event_type": "wishlist"},
]


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": service_metadata(
            "ai-service",
            8006,
            [
                "hybrid recommendations",
                "semantic search",
                "behavior analysis",
                "fraud scoring",
                "demand forecasting",
            ],
        ),
        "embedding_model": settings.search_embedding_model,
    }


@app.post("/recommendations/hybrid")
def recommend(request: RecommendationRequest):
    catalog = request.catalog or DEFAULT_CATALOG
    interactions = request.interactions or DEFAULT_INTERACTIONS
    return {
        "user_id": request.user_id,
        "recommendations": hybrid_recommendations(request.user_id, catalog, interactions, request.top_k),
    }


@app.post("/search/semantic")
def semantic_search(request: SemanticSearchRequest):
    catalog = request.catalog or DEFAULT_CATALOG
    return {
        "query": request.query,
        "results": search_engine.semantic_search(request.query, catalog, request.top_k),
    }


@app.post("/behavior/personalize")
def personalize(events: list[BehaviorEvent]):
    category_weights: dict[str, float] = defaultdict(float)
    event_totals: dict[str, int] = defaultdict(int)
    for event in events:
        category = event.category or "uncategorized"
        event_totals[event.event_type] += 1
        if event.event_type == "purchase":
            category_weights[category] += 5
        elif event.event_type == "cart":
            category_weights[category] += 3
        elif event.event_type == "wishlist":
            category_weights[category] += 2
        elif event.event_type == "view":
            category_weights[category] += 1
        else:
            category_weights[category] += 0.5

    return {
        "top_categories": sorted(category_weights.items(), key=lambda item: item[1], reverse=True),
        "event_totals": dict(event_totals),
        "personalization_strategy": "event_weighted_affinity_profile",
    }


@app.post("/payments/fraud-score")
def fraud_score(request: FraudCheckRequest):
    return compute_fraud_score(request.model_dump())


@app.post("/inventory/demand-forecast")
def forecast(request: DemandForecastRequest):
    return {
        "sku": request.sku,
        **demand_forecast(request.daily_sales_history, request.lead_time_days, request.stock_on_hand),
    }
