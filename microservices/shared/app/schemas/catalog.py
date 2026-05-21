from typing import Literal

from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    sku: str
    name: str
    description: str
    brand: str
    category: str
    price: float
    count_in_stock: int = 0
    availability: Literal["in-stock", "out-of-stock", "preorder"] = "in-stock"
    tags: list[str] = Field(default_factory=list)
    semantic_keywords: list[str] = Field(default_factory=list)
    vendor_name: str = "Handcrafts"
    rating: float = 0.0
    purchases: int = 0
    views: int = 0


class ProductDocument(ProductBase):
    image_urls: list[str] = Field(default_factory=list)
    specs: list[str] = Field(default_factory=list)
    featured: bool = False


class ProductUpsertResponse(BaseModel):
    sku: str
    persisted_to: list[str]
    index_target: str
    status: str


class CatalogSearchRequest(BaseModel):
    query: str
    category: str | None = None
    min_price: float | None = None
    max_price: float | None = None
    top_k: int = 10
