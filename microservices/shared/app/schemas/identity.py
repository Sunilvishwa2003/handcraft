from pydantic import BaseModel, EmailStr, Field


class UserRegistration(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    is_admin: bool = False
    is_vendor: bool = False


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserProfile(BaseModel):
    id: str
    name: str
    email: EmailStr
    is_admin: bool = False
    is_vendor: bool = False
    wishlist: list[str] = Field(default_factory=list)
    recently_viewed: list[str] = Field(default_factory=list)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile
