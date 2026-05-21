from typing import Literal

from pydantic import BaseModel, Field


class MediaUploadRequest(BaseModel):
    file_name: str = Field(min_length=1)
    content_type: Literal["image/jpeg", "image/png", "image/webp", "image/avif"]
    file_size: int = Field(gt=0)
    product_sku: str | None = None
    folder: str = "products"


class MediaUploadResponse(BaseModel):
    asset_key: str
    upload_strategy: Literal["presigned-put", "cloudinary-direct"] = "presigned-put"
    upload_url: str
    public_url: str
    cdn_url: str
    headers: dict[str, str] = Field(default_factory=dict)
    expires_in: int = 900
    allowed_content_types: list[str] = Field(default_factory=list)


class ConfirmUploadedAssetRequest(BaseModel):
    asset_key: str
    checksum: str | None = None
    width: int | None = None
    height: int | None = None
    variant: Literal["original", "optimized-webp"] = "original"


class ConfirmUploadedAssetResponse(BaseModel):
    asset_key: str
    status: Literal["confirmed"] = "confirmed"
    stored_as: str
    cdn_url: str
