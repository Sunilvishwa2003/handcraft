from typing import Literal

from pydantic import BaseModel, Field


class BehaviorEvent(BaseModel):
    user_id: str | None = None
    product_id: str | None = None
    category: str | None = None
    event_type: Literal["view", "search", "cart", "wishlist", "purchase", "checkout"]
    query: str | None = None
    risk_score: float = 0


class RecommendationRequest(BaseModel):
    user_id: str
    catalog: list[dict] = Field(default_factory=list)
    interactions: list[dict] = Field(default_factory=list)
    top_k: int = 8


class SemanticSearchRequest(BaseModel):
    query: str
    catalog: list[dict] = Field(default_factory=list)
    top_k: int = 10


class FraudCheckRequest(BaseModel):
    user_id: str
    total_price: float
    item_count: int
    payment_method: str
    recent_checkout_attempts: int = 0
    failed_payments: int = 0
    device_changes: int = 0
    account_age_days: int = 365


class DemandForecastRequest(BaseModel):
    sku: str
    daily_sales_history: list[int] = Field(default_factory=list)
    lead_time_days: int = 7
    stock_on_hand: int = 0
