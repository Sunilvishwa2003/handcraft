from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException

from shared.app.core.config import service_metadata, settings
from shared.app.schemas.media import (
    ConfirmUploadedAssetRequest,
    ConfirmUploadedAssetResponse,
    MediaUploadRequest,
    MediaUploadResponse,
)


app = FastAPI(title="Media Service", version="1.0.0")

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif"}
ASSET_REGISTRY: dict[str, dict[str, object]] = {}


def sanitize_file_name(file_name: str) -> str:
    safe_stem = "".join(char.lower() if char.isalnum() else "-" for char in Path(file_name).stem).strip("-")
    safe_suffix = Path(file_name).suffix.lower() or ".bin"
    compact_stem = "-".join(filter(None, safe_stem.split("-"))) or "asset"
    return f"{compact_stem}{safe_suffix}"


def build_asset_key(payload: MediaUploadRequest) -> str:
    timestamp = datetime.now(timezone.utc)
    product_segment = payload.product_sku.strip().lower() if payload.product_sku else "unassigned"
    safe_name = sanitize_file_name(payload.file_name)
    return (
        f"{payload.folder.strip().lower()}/{product_segment}/"
        f"{timestamp.year:04d}/{timestamp.month:02d}/{uuid4().hex}-{safe_name}"
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": service_metadata(
            "media-service",
            8007,
            [
                "issue direct upload contracts",
                "validate image metadata",
                "return object storage and cdn urls",
            ],
        ),
        "storage": {
            "bucket": settings.media_bucket,
            "origin_base_url": settings.media_origin_base_url,
            "cdn_base_url": settings.media_cdn_base_url,
            "upload_strategy": settings.media_upload_strategy,
        },
    }


@app.post("/upload-image", response_model=MediaUploadResponse)
def create_upload_contract(payload: MediaUploadRequest):
    if payload.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    if payload.file_size > settings.max_image_upload_bytes:
        raise HTTPException(status_code=400, detail="File exceeds the configured upload limit")

    asset_key = build_asset_key(payload)
    public_url = f"{settings.media_origin_base_url.rstrip('/')}/{asset_key}"
    cdn_url = f"{settings.media_cdn_base_url.rstrip('/')}/{asset_key}"
    upload_url = f"{settings.media_origin_base_url.rstrip('/')}/direct-upload/{asset_key}?signature=demo-signed"

    ASSET_REGISTRY[asset_key] = {
        "file_name": payload.file_name,
        "content_type": payload.content_type,
        "file_size": payload.file_size,
        "product_sku": payload.product_sku,
        "public_url": public_url,
        "cdn_url": cdn_url,
        "confirmed": False,
    }

    return MediaUploadResponse(
        asset_key=asset_key,
        upload_strategy="presigned-put",
        upload_url=upload_url,
        public_url=public_url,
        cdn_url=cdn_url,
        headers={"content-type": payload.content_type, "x-demo-upload-token": uuid4().hex},
        expires_in=900,
        allowed_content_types=sorted(ALLOWED_CONTENT_TYPES),
    )


@app.post("/assets/confirm", response_model=ConfirmUploadedAssetResponse)
def confirm_uploaded_asset(payload: ConfirmUploadedAssetRequest):
    asset = ASSET_REGISTRY.get(payload.asset_key)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset contract not found")

    asset["confirmed"] = True
    asset["checksum"] = payload.checksum
    asset["width"] = payload.width
    asset["height"] = payload.height
    asset["variant"] = payload.variant

    return ConfirmUploadedAssetResponse(
        asset_key=payload.asset_key,
        stored_as=f"s3://{settings.media_bucket}/{payload.asset_key}",
        cdn_url=str(asset["cdn_url"]),
    )


@app.get("/assets/{asset_key:path}")
def get_asset_manifest(asset_key: str):
    asset = ASSET_REGISTRY.get(asset_key)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset
