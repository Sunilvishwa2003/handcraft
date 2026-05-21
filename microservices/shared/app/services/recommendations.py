from collections import defaultdict
from math import log10, sqrt
from typing import Mapping


BEHAVIOR_WEIGHTS = {
    "view": 1.0,
    "search": 0.5,
    "wishlist": 2.5,
    "cart": 3.0,
    "checkout": 4.0,
    "purchase": 5.0,
}


def _tokenize(product: Mapping[str, object]) -> set[str]:
    fields: list[str] = []
    for key in ("name", "description", "brand", "category", "vendor_name"):
        value = product.get(key)
        if isinstance(value, str):
            fields.extend(value.lower().split())
    for key in ("tags", "semantic_keywords"):
        value = product.get(key) or []
        if isinstance(value, list):
            fields.extend(str(item).lower() for item in value)
    return {token.strip(".,-_") for token in fields if token}


def cosine_similarity(left: dict[str, float], right: dict[str, float]) -> float:
    common = set(left) & set(right)
    numerator = sum(left[item] * right[item] for item in common)
    left_norm = sqrt(sum(value * value for value in left.values()))
    right_norm = sqrt(sum(value * value for value in right.values()))
    if not left_norm or not right_norm:
        return 0.0
    return numerator / (left_norm * right_norm)


def collaborative_filter_scores(target_user_id: str, interactions: list[Mapping[str, object]]) -> dict[str, float]:
    user_vectors: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for event in interactions:
        user_id = str(event.get("user_id") or "")
        product_id = str(event.get("product_id") or "")
        event_type = str(event.get("event_type") or "view")
        if user_id and product_id:
            user_vectors[user_id][product_id] += BEHAVIOR_WEIGHTS.get(event_type, 0.5)

    target_vector = user_vectors.get(target_user_id, {})
    scores: dict[str, float] = defaultdict(float)
    for user_id, vector in user_vectors.items():
        if user_id == target_user_id:
            continue
        similarity = cosine_similarity(target_vector, vector)
        if similarity <= 0:
            continue
        for product_id, weight in vector.items():
            if product_id not in target_vector:
                scores[product_id] += similarity * weight
    return dict(scores)


def content_based_scores(
    anchor_products: list[Mapping[str, object]],
    catalog: list[Mapping[str, object]],
) -> dict[str, float]:
    if not anchor_products:
        return {}

    anchor_vector: dict[str, float] = defaultdict(float)
    anchor_ids = {str(product.get("sku") or product.get("id") or "") for product in anchor_products}
    for product in anchor_products:
        for token in _tokenize(product):
            anchor_vector[token] += 1.0

    scores: dict[str, float] = {}
    for product in catalog:
        product_id = str(product.get("sku") or product.get("id") or "")
        if not product_id or product_id in anchor_ids:
            continue
        vector = {token: 1.0 for token in _tokenize(product)}
        scores[product_id] = cosine_similarity(anchor_vector, vector)
    return scores


def hybrid_recommendations(
    user_id: str,
    catalog: list[Mapping[str, object]],
    interactions: list[Mapping[str, object]],
    top_k: int = 8,
) -> list[dict[str, object]]:
    collaborative_scores = collaborative_filter_scores(user_id, interactions)
    seen_product_ids = {
        str(event.get("product_id"))
        for event in interactions
        if str(event.get("user_id")) == user_id and event.get("product_id")
    }
    anchor_products = [
        product
        for product in catalog
        if str(product.get("sku") or product.get("id") or "") in seen_product_ids
    ]
    content_scores = content_based_scores(anchor_products, catalog)

    ranked: list[tuple[float, Mapping[str, object]]] = []
    for product in catalog:
        product_id = str(product.get("sku") or product.get("id") or "")
        if product_id in seen_product_ids:
            continue
        collaborative_score = collaborative_scores.get(product_id, 0.0)
        content_score = content_scores.get(product_id, 0.0)
        popularity_boost = log10(float(product.get("purchases", 0)) + float(product.get("views", 0)) + 10)
        availability_boost = 0.5 if product.get("availability") == "in-stock" else 0.0
        score = (collaborative_score * 0.5) + (content_score * 0.35) + (popularity_boost * 0.1) + availability_boost
        ranked.append((score, product))

    ranked.sort(key=lambda item: item[0], reverse=True)
    return [
        {
            "sku": product.get("sku") or product.get("id"),
            "name": product.get("name"),
            "category": product.get("category"),
            "score": round(score, 4),
            "strategy": "hybrid_collaborative_content",
        }
        for score, product in ranked[:top_k]
    ]
