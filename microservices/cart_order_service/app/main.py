from uuid import uuid4

from fastapi import FastAPI

from shared.app.core.config import service_metadata
from shared.app.schemas.commerce import CartLine, CartState, OrderRequest, OrderResponse


app = FastAPI(title="Cart and Order Service", version="1.0.0")

CARTS: dict[str, CartState] = {}
ORDERS: dict[str, dict[str, object]] = {}


def _order_total(items: list[CartLine]) -> float:
    return round(sum(item.qty * item.unit_price for item in items), 2)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": service_metadata(
            "cart-order-service",
            8003,
            [
                "redis-backed carts",
                "order creation",
                "checkout orchestration",
            ],
        ),
        "active_carts": len(CARTS),
        "orders": len(ORDERS),
    }


@app.get("/carts/{user_id}", response_model=CartState)
def get_cart(user_id: str):
    return CARTS.get(user_id, CartState(user_id=user_id))


@app.post("/carts/{user_id}/items", response_model=CartState)
def add_to_cart(user_id: str, item: CartLine):
    current = CARTS.get(user_id, CartState(user_id=user_id))
    items = list(current.items)
    for index, existing in enumerate(items):
        if existing.sku == item.sku:
            items[index] = CartLine(
                sku=existing.sku,
                name=existing.name,
                qty=existing.qty + item.qty,
                unit_price=existing.unit_price,
            )
            break
    else:
        items.append(item)
    updated = CartState(user_id=user_id, items=items)
    CARTS[user_id] = updated
    return updated


@app.post("/orders", response_model=OrderResponse)
def create_order(order: OrderRequest):
    order_id = f"ord-{uuid4().hex[:12]}"
    total = _order_total(order.items)
    response = OrderResponse(
        order_id=order_id,
        user_id=order.user_id,
        total_price=total,
        status="placed",
        inventory_status="reservation_requested",
        payment_status="pending_authorization",
        emitted_events=["order-created", "inventory-reservation-requested", "payment-authorization-requested"],
    )
    ORDERS[order_id] = {
        "request": order.model_dump(),
        "response": response.model_dump(),
    }
    return response


@app.get("/orders/{order_id}")
def get_order(order_id: str):
    return ORDERS.get(order_id, {"detail": "Order not found"})
