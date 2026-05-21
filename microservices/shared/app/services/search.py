from math import sqrt
from typing import Mapping

try:
    from sentence_transformers import SentenceTransformer
except Exception:  # pragma: no cover - optional runtime dependency
    SentenceTransformer = None


def _lexical_tokens(text: str) -> list[str]:
    return [token.strip(".,-_").lower() for token in text.split() if token.strip(".,-_")]


def _product_corpus(product: Mapping[str, object]) -> str:
    parts: list[str] = []
    for key in ("name", "description", "brand", "category", "vendor_name"):
        value = product.get(key)
        if isinstance(value, str):
            parts.append(value)
    for key in ("tags", "semantic_keywords", "specs"):
        value = product.get(key)
        if isinstance(value, list):
            parts.extend(str(item) for item in value)
    return " ".join(parts)


def _lexical_score(query: str, product: Mapping[str, object]) -> float:
    query_tokens = _lexical_tokens(query)
    product_tokens = _lexical_tokens(_product_corpus(product))
    if not query_tokens or not product_tokens:
        return 0.0
    overlap = sum(1 for token in query_tokens if token in product_tokens)
    fuzzy = sum(1 for token in query_tokens if any(token in candidate for candidate in product_tokens))
    return overlap * 2 + fuzzy


def _cosine(left: list[float], right: list[float]) -> float:
    numerator = sum(a * b for a, b in zip(left, right))
    left_norm = sqrt(sum(a * a for a in left))
    right_norm = sqrt(sum(b * b for b in right))
    if not left_norm or not right_norm:
        return 0.0
    return numerator / (left_norm * right_norm)


class SemanticSearchEngine:
    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self._model = None

    def _load_model(self):
        if self._model is None and SentenceTransformer is not None:
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def semantic_search(
        self,
        query: str,
        products: list[Mapping[str, object]],
        top_k: int = 10,
    ) -> list[dict[str, object]]:
        model = self._load_model()
        if model is None:
            ranked = sorted(
                products,
                key=lambda product: _lexical_score(query, product),
                reverse=True,
            )
            return [
                {
                    "sku": product.get("sku") or product.get("id"),
                    "name": product.get("name"),
                    "score": round(_lexical_score(query, product), 4),
                    "strategy": "lexical_fallback",
                }
                for product in ranked[:top_k]
                if _lexical_score(query, product) > 0
            ]

        corpus = [_product_corpus(product) for product in products]
        query_embedding = model.encode(query).tolist()
        corpus_embeddings = model.encode(corpus).tolist()
        ranked: list[tuple[float, Mapping[str, object]]] = []
        for embedding, product in zip(corpus_embeddings, products):
            ranked.append((_cosine(query_embedding, embedding), product))
        ranked.sort(key=lambda item: item[0], reverse=True)
        return [
            {
                "sku": product.get("sku") or product.get("id"),
                "name": product.get("name"),
                "score": round(score, 4),
                "strategy": "semantic_minilm",
            }
            for score, product in ranked[:top_k]
        ]
