from typing import Literal

from pydantic import BaseModel, Field


class CartLine(BaseModel):
    sku: str
    name: str
    qty: int = Field(ge=1)
    unit_price: float = Field(ge=0)


class CartState(BaseModel):
    user_id: str
    items: list[CartLine] = Field(default_factory=list)
    cache_backend: str = "redis"


class ShippingAddress(BaseModel):
    address: str
    city: str
    postal_code: str
    country: str
    phone: str | None = None


class OrderRequest(BaseModel):
    user_id: str
    items: list[CartLine]
    shipping_address: ShippingAddress
    shipping_option: Literal["standard", "express", "priority"] = "standard"
    payment_method: str


class OrderResponse(BaseModel):
    order_id: str
    user_id: str
    total_price: float
    status: str
    inventory_status: str
    payment_status: str
    emitted_events: list[str] = Field(default_factory=list)


class PaymentAuthorizationRequest(BaseModel):
    order_id: str
    user_id: str
    amount: float
    payment_method: str
    recent_checkout_attempts: int = 0
    failed_payments: int = 0
    device_changes: int = 0


class InventoryReservationRequest(BaseModel):
    order_id: str
    sku: str
    quantity: int = Field(ge=1)


class DeliveryEvent(BaseModel):
    order_id: str
    status: str
    location: str
    message: str


class InventoryForecastRequest(BaseModel):
    sku: str
    daily_sales_history: list[int] = Field(default_factory=list)
    lead_time_days: int = 7
    stock_on_hand: int = 0
