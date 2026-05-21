from typing import Mapping


def compute_fraud_score(payload: Mapping[str, object]) -> dict[str, object]:
    score = 0
    reasons: list[str] = []
    total_price = float(payload.get("total_price", 0))
    item_count = int(payload.get("item_count", 0))
    recent_checkout_attempts = int(payload.get("recent_checkout_attempts", 0))
    failed_payments = int(payload.get("failed_payments", 0))
    device_changes = int(payload.get("device_changes", 0))
    account_age_days = int(payload.get("account_age_days", 365))
    payment_method = str(payload.get("payment_method", "")).lower()

    if total_price >= 100000:
        score += 35
        reasons.append("high_order_value")
    if item_count >= 10:
        score += 20
        reasons.append("large_basket")
    if recent_checkout_attempts >= 4:
        score += 15
        reasons.append("rapid_retries")
    if failed_payments >= 3:
        score += 15
        reasons.append("multiple_failed_payments")
    if device_changes >= 2:
        score += 10
        reasons.append("device_fingerprint_change")
    if payment_method == "cod" and total_price >= 50000:
        score += 15
        reasons.append("high_value_cod")
    if account_age_days <= 3 and total_price >= 25000:
        score += 15
        reasons.append("new_account_high_value")

    if score >= 80:
        decision = "block"
    elif score >= 55:
        decision = "review"
    elif score >= 35:
        decision = "monitor"
    else:
        decision = "allow"

    return {
        "score": min(score, 100),
        "decision": decision,
        "reasons": reasons,
        "model": "rules_velocity_value_device",
    }
