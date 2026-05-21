from fastapi import FastAPI, HTTPException

from shared.app.core.config import service_metadata
from shared.app.schemas.commerce import DeliveryEvent, InventoryForecastRequest, InventoryReservationRequest
from shared.app.services.forecasting import demand_forecast


app = FastAPI(title="Inventory and Delivery Service", version="1.0.0")

INVENTORY = {
    "HC-001": {"sku": "HC-001", "stock_on_hand": 24, "reserved": 0},
    "HC-002": {"sku": "HC-002", "stock_on_hand": 60, "reserved": 0},
}

DELIVERY_TIMELINES: dict[str, list[dict[str, object]]] = {}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": service_metadata(
            "inventory-service",
            8005,
            [
                "inventory reservation",
                "stock deduction planning",
                "delivery tracking",
                "demand forecasting",
            ],
        ),
        "tracked_skus": list(INVENTORY.keys()),
    }


@app.get("/inventory/{sku}")
def get_inventory(sku: str):
    if sku not in INVENTORY:
        raise HTTPException(status_code=404, detail="SKU not found")
    return INVENTORY[sku]


@app.post("/inventory/reserve")
def reserve_inventory(request: InventoryReservationRequest):
    record = INVENTORY.get(request.sku)
    if not record:
        raise HTTPException(status_code=404, detail="SKU not found")
    available = record["stock_on_hand"] - record["reserved"]
    if available < request.quantity:
        return {
            "order_id": request.order_id,
            "sku": request.sku,
            "reserved": False,
            "reason": "insufficient_stock",
        }
    record["reserved"] += request.quantity
    return {
        "order_id": request.order_id,
        "sku": request.sku,
        "reserved": True,
        "reservation_backend": "redis_lock_then_mongodb_commit",
    }


@app.post("/inventory/forecast")
def forecast_inventory(request: InventoryForecastRequest):
    result = demand_forecast(
        request.daily_sales_history,
        request.lead_time_days,
        request.stock_on_hand,
    )
    return {"sku": request.sku, **result}


@app.post("/delivery/events")
def append_delivery_event(event: DeliveryEvent):
    timeline = DELIVERY_TIMELINES.setdefault(event.order_id, [])
    timeline.append(event.model_dump())
    return {"order_id": event.order_id, "events": timeline}


@app.get("/delivery/track/{order_id}")
def get_tracking(order_id: str):
    return {"order_id": order_id, "events": DELIVERY_TIMELINES.get(order_id, [])}
