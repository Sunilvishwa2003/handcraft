from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    app_env: str = os.getenv("APP_ENV", "development")
    mongo_uri: str = os.getenv("MONGO_URI", "mongodb://mongo:27017/amazon_like_commerce")
    redis_url: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    elasticsearch_url: str = os.getenv("ELASTICSEARCH_URL", "http://elasticsearch:9200")
    kafka_bootstrap_servers: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
    jwt_secret: str = os.getenv("JWT_SECRET", "replace-with-a-real-secret")
    jwt_exp_minutes: int = int(os.getenv("JWT_EXP_MINUTES", "1440"))
    search_embedding_model: str = os.getenv(
        "SEARCH_EMBEDDING_MODEL",
        "sentence-transformers/all-MiniLM-L6-v2",
    )
    recommendation_cache_ttl: int = int(os.getenv("RECOMMENDATION_CACHE_TTL", "900"))
    media_bucket: str = os.getenv("MEDIA_BUCKET", "commerce-product-media")
    media_origin_base_url: str = os.getenv("MEDIA_ORIGIN_BASE_URL", "https://storage.example.com")
    media_cdn_base_url: str = os.getenv("MEDIA_CDN_BASE_URL", "https://cdn.example.com")
    media_upload_strategy: str = os.getenv("MEDIA_UPLOAD_STRATEGY", "presigned-put")
    max_image_upload_bytes: int = int(os.getenv("MAX_IMAGE_UPLOAD_BYTES", "10485760"))


settings = Settings()


def service_metadata(service_name: str, port: int, responsibilities: list[str]) -> dict[str, object]:
    return {
        "service": service_name,
        "port": port,
        "environment": settings.app_env,
        "dependencies": {
            "mongodb": settings.mongo_uri,
            "redis": settings.redis_url,
            "elasticsearch": settings.elasticsearch_url,
            "kafka": settings.kafka_bootstrap_servers,
        },
        "responsibilities": responsibilities,
    }
