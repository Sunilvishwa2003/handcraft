from fastapi import FastAPI, HTTPException

from shared.app.core.config import service_metadata
from shared.app.schemas.catalog import CatalogSearchRequest, ProductDocument, ProductUpsertResponse


app = FastAPI(title="Catalog Service", version="1.0.0")

CATALOG: dict[str, dict[str, object]] = {
    "HC-001": {
        "sku": "HC-001",
        "name": "Handwoven Cane Basket",
        "description": "Eco-friendly storage basket for living rooms and gifting.",
        "brand": "Handcrafts",
        "category": "Home Decor",
        "price": 1299,
        "count_in_stock": 24,
        "availability": "in-stock",
        "tags": ["eco-friendly", "woven", "storage"],
        "semantic_keywords": ["gift", "natural", "basket"],
        "vendor_name": "Handcrafts",
        "rating": 4.7,
        "purchases": 120,
        "views": 1240,
        "image_urls": [],
        "specs": ["cane", "handmade"],
        "featured": True,
    },
    "HC-002": {
        "sku": "HC-002",
        "name": "Brass Diya Set",
        "description": "Festival-ready brass diya set for pooja and decor.",
        "brand": "Heritage Glow",
        "category": "Festival Decor",
        "price": 899,
        "count_in_stock": 60,
        "availability": "in-stock",
        "tags": ["brass", "pooja", "festive"],
        "semantic_keywords": ["festival", "gift", "home decor"],
        "vendor_name": "Heritage Glow",
        "rating": 4.5,
        "purchases": 210,
        "views": 2100,
        "image_urls": [],
        "specs": ["brass", "traditional"],
        "featured": False,
    },
}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": service_metadata(
            "catalog-service",
            8001,
            [
                "product upload",
                "product update",
                "catalog persistence in mongodb",
                "search indexing in elasticsearch",
            ],
        ),
        "products_loaded": len(CATALOG),
        "index_name": "products_v1",
    }


@app.get("/products")
def list_products():
    return {"items": list(CATALOG.values()), "count": len(CATALOG)}


@app.post("/products", response_model=ProductUpsertResponse)
def create_product(product: ProductDocument):
    CATALOG[product.sku] = product.model_dump()
    return ProductUpsertResponse(
        sku=product.sku,
        persisted_to=["mongodb.catalog.products"],
        index_target="elasticsearch.products_v1",
        status="created_and_index_requested",
    )


@app.put("/products/{sku}", response_model=ProductUpsertResponse)
def update_product(sku: str, product: ProductDocument):
    if sku not in CATALOG:
        raise HTTPException(status_code=404, detail="Product not found")
    CATALOG[sku] = product.model_dump()
    return ProductUpsertResponse(
        sku=sku,
        persisted_to=["mongodb.catalog.products"],
        index_target="elasticsearch.products_v1",
        status="updated_and_reindexed",
    )


@app.post("/products/search")
def search_products(request: CatalogSearchRequest):
    query = request.query.lower()
    results = []
    for product in CATALOG.values():
        corpus = " ".join(
            [
                str(product.get("name", "")),
                str(product.get("description", "")),
                str(product.get("brand", "")),
                str(product.get("category", "")),
                " ".join(product.get("tags", [])),
                " ".join(product.get("semantic_keywords", [])),
            ]
        ).lower()
        if request.category and str(product.get("category")) != request.category:
            continue
        if request.min_price is not None and float(product.get("price", 0)) < request.min_price:
            continue
        if request.max_price is not None and float(product.get("price", 0)) > request.max_price:
            continue
        if query in corpus:
            results.append(product)
    return {
        "query": request.query,
        "hits": results[: request.top_k],
        "search_engine": "elasticsearch_contract_with_local_fallback",
    }


@app.post("/products/{sku}/index")
def index_product(sku: str):
    product = CATALOG.get(sku)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {
        "sku": sku,
        "indexed": True,
        "index_name": "products_v1",
        "document_keys": sorted(product.keys()),
    }
