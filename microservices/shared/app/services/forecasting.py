from math import ceil


def exponential_smoothing(history: list[int], alpha: float = 0.35) -> float:
    if not history:
        return 0.0
    forecast = float(history[0])
    for actual in history[1:]:
        forecast = alpha * actual + (1 - alpha) * forecast
    return forecast


def moving_average(history: list[int], window: int = 7) -> float:
    if not history:
        return 0.0
    sample = history[-window:] if len(history) >= window else history
    return sum(sample) / len(sample)


def demand_forecast(
    history: list[int],
    lead_time_days: int,
    stock_on_hand: int,
) -> dict[str, object]:
    smoothed = exponential_smoothing(history)
    average = moving_average(history)
    forecast = round((smoothed * 0.6) + (average * 0.4), 2)
    reorder_point = ceil(forecast * lead_time_days * 1.15)
    suggested_reorder_qty = max(0, reorder_point - stock_on_hand)

    return {
        "forecast_per_day": forecast,
        "reorder_point": reorder_point,
        "stock_on_hand": stock_on_hand,
        "lead_time_days": lead_time_days,
        "suggested_reorder_qty": suggested_reorder_qty,
        "strategy": "exponential_smoothing_plus_buffer",
    }
