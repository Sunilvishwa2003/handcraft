from fastapi import FastAPI

from shared.app.core.config import service_metadata
from shared.app.schemas.commerce import PaymentAuthorizationRequest
from shared.app.services.fraud import compute_fraud_score


app = FastAPI(title="Payment Service", version="1.0.0")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": service_metadata(
            "payment-service",
            8004,
            [
                "payment authorization",
                "fraud gate before capture",
                "gateway adapter abstraction",
            ],
        ),
        "supported_gateways": ["stripe", "razorpay", "paypal", "cod"],
    }


@app.post("/payments/authorize")
def authorize_payment(request: PaymentAuthorizationRequest):
    fraud = compute_fraud_score(
        {
            "total_price": request.amount,
            "item_count": 1,
            "payment_method": request.payment_method,
            "recent_checkout_attempts": request.recent_checkout_attempts,
            "failed_payments": request.failed_payments,
            "device_changes": request.device_changes,
        }
    )
    approved = fraud["decision"] in {"allow", "monitor"}
    return {
        "order_id": request.order_id,
        "gateway_reference": f"pay-{request.order_id}",
        "fraud": fraud,
        "payment_status": "authorized" if approved else "manual_review",
        "next_step": "capture_and_confirm_inventory" if approved else "fraud_team_review",
    }
