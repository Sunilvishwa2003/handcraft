# Production E-Commerce Architecture

This document maps the current repository to a production-ready React + FastAPI + MongoDB architecture that fixes the current image-delivery weaknesses and moves product media to object storage plus CDN.

## Current-State Findings

The active storefront is `frontend/`.

The current image issue came from a combination of three project realities:

1. Some frontend screens resolved relative image paths through a helper, while other screens rendered raw values directly.
2. The homepage fallback slider referenced `default-slider-*.jpg`, but those files do not exist in `backend/uploads`.
3. The current backend upload flow stores files on the application disk via Multer and serves them from `/uploads`, which is not durable or scalable for multi-instance production.

## Target Architecture Diagram

```text
[ React / Next.js Frontend ]
        |
        | 1. Request upload contract
        v
[ FastAPI API Gateway ]
        |
        +--------------------------+
        |                          |
        v                          v
[ Product Service ]          [ Media Service ]
        |                          |
        | store product data       | validate upload request
        | with image URLs          | create presigned upload or
        v                          | Cloudinary direct-upload contract
[ MongoDB ]                        v
                              [ S3 or Cloudinary ]
                                      |
                                      v
                                  [ CDN Layer ]
                               CloudFront / Cloudinary CDN
                                      |
                                      v
                           fast product image delivery
```

## Recommended Services

### Frontend Layer

- React/Next.js storefront and admin console
- Upload UI for products
- Uses direct upload for product images
- Stores and renders only CDN URLs

### API Gateway

- Single public API domain
- Auth, rate limiting, routing, observability
- Keeps frontend contracts stable while services evolve

### Product Service

- Owns product CRUD
- Stores catalog metadata in MongoDB
- Never stores image binaries
- Accepts `imageUrls` from the media workflow

### Media Service

- Validates file size and content type
- Generates presigned S3 upload URLs or Cloudinary upload payloads
- Returns final CDN URL
- Optionally confirms upload metadata and triggers optimization jobs

### Database Layer

- MongoDB stores product metadata only
- Product documents contain `imageUrls`, `thumbnailUrl`, and optional `media` metadata

### CDN Layer

- CloudFront on top of S3, or Cloudinary CDN directly
- Caches optimized image variants close to users

## Upload Flow

```text
1. Admin selects an image in React.
2. React calls POST /upload-image on FastAPI Media Service.
3. Media Service validates extension, MIME type, and size.
4. Media Service returns:
   - upload URL
   - asset key
   - final public CDN URL
5. React uploads the file directly to S3 or Cloudinary.
6. React sends POST /products with the returned CDN URL.
7. Product Service stores only image URLs in MongoDB.
8. Storefront renders the CDN URL through the CDN edge cache.
```

## API Design

### `POST /upload-image`

Request:

```json
{
  "fileName": "stone-name-board.webp",
  "contentType": "image/webp",
  "fileSize": 248300,
  "productSku": "SNB-102",
  "folder": "products"
}
```

Response:

```json
{
  "assetKey": "products/snb-102/2026/05/uuid-stone-name-board.webp",
  "uploadStrategy": "presigned-put",
  "uploadUrl": "https://storage.example.com/direct-upload/products/snb-102/2026/05/uuid-stone-name-board.webp?signature=demo-signed",
  "publicUrl": "https://storage.example.com/products/snb-102/2026/05/uuid-stone-name-board.webp",
  "cdnUrl": "https://cdn.example.com/products/snb-102/2026/05/uuid-stone-name-board.webp",
  "headers": {
    "content-type": "image/webp"
  },
  "expiresIn": 900
}
```

### `POST /products`

Request:

```json
{
  "sku": "SNB-102",
  "name": "Stone Name Board",
  "description": "Hand-carved premium stone name board.",
  "brand": "MahabsCrafto",
  "category": "Stone",
  "price": 2499,
  "countInStock": 12,
  "imageUrls": [
    "https://cdn.example.com/products/snb-102/2026/05/uuid-stone-name-board.webp"
  ],
  "thumbnailUrl": "https://cdn.example.com/products/snb-102/2026/05/uuid-stone-name-board.webp"
}
```

### `GET /products`

Response:

```json
{
  "items": [
    {
      "sku": "SNB-102",
      "name": "Stone Name Board",
      "price": 2499,
      "imageUrls": [
        "https://cdn.example.com/products/snb-102/2026/05/uuid-stone-name-board.webp"
      ],
      "thumbnailUrl": "https://cdn.example.com/products/snb-102/2026/05/uuid-stone-name-board.webp"
    }
  ],
  "count": 1
}
```

## MongoDB Product Schema

```javascript
{
  _id: ObjectId,
  sku: "SNB-102",
  name: "Stone Name Board",
  description: "Hand-carved premium stone name board.",
  brand: "MahabsCrafto",
  category: "Stone",
  price: 2499,
  countInStock: 12,
  imageUrls: [
    "https://cdn.example.com/products/snb-102/2026/05/original.webp",
    "https://cdn.example.com/products/snb-102/2026/05/detail-1.webp"
  ],
  thumbnailUrl: "https://cdn.example.com/products/snb-102/2026/05/thumb.webp",
  media: {
    provider: "s3",
    folder: "products/snb-102/2026/05",
    primaryAssetKey: "products/snb-102/2026/05/original.webp"
  },
  createdAt: ISODate(),
  updatedAt: ISODate()
}
```

## Product Image Folder Strategy

```text
products/
  <sku>/
    2026/
      05/
        original.webp
        gallery-01.webp
        gallery-02.webp
        thumb.webp
```

Benefits:

- predictable cleanup
- easy cache invalidation by path versioning
- simpler lifecycle rules
- easy grouping by product

## FastAPI Sample

The repository now includes a starter `media_service` scaffold at [main.py](/abs/path/d:/e-website/microservices/media_service/app/main.py:1).

Example presigned-upload contract handler:

```python
@app.post("/upload-image", response_model=MediaUploadResponse)
def create_upload_contract(payload: MediaUploadRequest):
    if payload.file_size > settings.max_image_upload_bytes:
        raise HTTPException(status_code=400, detail="File exceeds the configured upload limit")

    asset_key = build_asset_key(payload)
    public_url = f"{settings.media_origin_base_url.rstrip('/')}/{asset_key}"
    cdn_url = f"{settings.media_cdn_base_url.rstrip('/')}/{asset_key}"

    return MediaUploadResponse(
        asset_key=asset_key,
        upload_strategy="presigned-put",
        upload_url=f"{settings.media_origin_base_url.rstrip('/')}/direct-upload/{asset_key}?signature=demo-signed",
        public_url=public_url,
        cdn_url=cdn_url,
        headers={"content-type": payload.content_type},
        expires_in=900,
    )
```

## React Upload Sample

```tsx
const contract = await apiFetch("/upload-image", {
  method: "POST",
  body: JSON.stringify({
    fileName: file.name,
    contentType: file.type,
    fileSize: file.size,
    productSku: form.sku,
    folder: "products",
  }),
});

await fetch(contract.uploadUrl, {
  method: "PUT",
  headers: contract.headers,
  body: file,
});

await apiFetch("/products", {
  method: "POST",
  body: JSON.stringify({
    ...productPayload,
    imageUrls: [...productPayload.imageUrls, contract.cdnUrl],
    thumbnailUrl: contract.cdnUrl,
  }),
});
```

## Best Practices Checklist

- Store only image URLs in MongoDB.
- Keep original binaries in S3 or Cloudinary, never in MongoDB.
- Prefer direct upload from frontend to object storage.
- Use presigned URLs for S3, or Cloudinary signed/direct upload widgets.
- Enforce MIME type, size, and extension validation in Media Service.
- Generate WebP or AVIF plus thumbnails asynchronously.
- Put a CDN in front of the object storage origin.
- Version paths or query params for cache busting.
- Add signed URLs for private/admin-only assets if needed.
- Use antivirus or content moderation checks for untrusted uploads.
- Add background jobs for resize, compress, EXIF stripping, and watermarking.
- Add Redis caching for hot product reads and product detail pages.
- Emit media-created and product-updated events for async workflows.

## Migration Plan From The Current Repo

1. Keep the current `frontend/` app and current product UI contracts.
2. Replace disk-backed uploads in `backend/src/routes/adminRoutes.ts` with a call to FastAPI Media Service.
3. Move product CRUD to FastAPI Product Service.
4. Keep MongoDB as the source of truth for catalog documents.
5. Add CDN-backed URLs to the existing frontend helper and remove all assumptions about local `/uploads`.
6. Retire local application-disk uploads after all products are migrated.
