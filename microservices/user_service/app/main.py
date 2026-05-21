import base64
import hashlib
import hmac
import json
import time
from uuid import uuid4

from fastapi import FastAPI, HTTPException

from shared.app.core.config import service_metadata, settings
from shared.app.schemas.identity import TokenResponse, UserLogin, UserProfile, UserRegistration


app = FastAPI(title="User Service", version="1.0.0")


def _b64url(value: bytes) -> bytes:
    return base64.urlsafe_b64encode(value).rstrip(b"=")


def _jwt_encode(payload: dict[str, object], secret: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    signing_input = b".".join(
        [
            _b64url(json.dumps(header, separators=(",", ":")).encode("utf-8")),
            _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8")),
        ]
    )
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return b".".join([signing_input, _b64url(signature)]).decode("utf-8")


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


USERS_BY_EMAIL: dict[str, dict[str, object]] = {
    "admin@example.com": {
        "id": "user-admin",
        "name": "Store Admin",
        "email": "admin@example.com",
        "password_hash": _hash_password("admin123"),
        "is_admin": True,
        "is_vendor": False,
        "wishlist": [],
        "recently_viewed": [],
    }
}


def _profile(record: dict[str, object]) -> UserProfile:
    return UserProfile(
        id=str(record["id"]),
        name=str(record["name"]),
        email=str(record["email"]),
        is_admin=bool(record.get("is_admin", False)),
        is_vendor=bool(record.get("is_vendor", False)),
        wishlist=list(record.get("wishlist", [])),
        recently_viewed=list(record.get("recently_viewed", [])),
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": service_metadata(
            "user-service",
            8002,
            [
                "jwt issuance",
                "profile management",
                "user registration and login",
            ],
        ),
        "user_count": len(USERS_BY_EMAIL),
    }


@app.post("/auth/register", response_model=TokenResponse)
def register(payload: UserRegistration):
    email = payload.email.lower()
    if email in USERS_BY_EMAIL:
        raise HTTPException(status_code=409, detail="Email already registered")
    record = {
        "id": f"user-{uuid4().hex[:10]}",
        "name": payload.name,
        "email": email,
        "password_hash": _hash_password(payload.password),
        "is_admin": payload.is_admin,
        "is_vendor": payload.is_vendor,
        "wishlist": [],
        "recently_viewed": [],
    }
    USERS_BY_EMAIL[email] = record
    profile = _profile(record)
    token = _jwt_encode(
        {
            "sub": profile.id,
            "email": profile.email,
            "is_admin": profile.is_admin,
            "exp": int(time.time()) + (settings.jwt_exp_minutes * 60),
        },
        settings.jwt_secret,
    )
    return TokenResponse(access_token=token, user=profile)


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: UserLogin):
    record = USERS_BY_EMAIL.get(payload.email.lower())
    if not record or record["password_hash"] != _hash_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    profile = _profile(record)
    token = _jwt_encode(
        {
            "sub": profile.id,
            "email": profile.email,
            "is_admin": profile.is_admin,
            "exp": int(time.time()) + (settings.jwt_exp_minutes * 60),
        },
        settings.jwt_secret,
    )
    return TokenResponse(access_token=token, user=profile)


@app.get("/profiles/{user_id}", response_model=UserProfile)
def get_profile(user_id: str):
    for record in USERS_BY_EMAIL.values():
        if record["id"] == user_id:
            return _profile(record)
    raise HTTPException(status_code=404, detail="User not found")
