from __future__ import annotations

from pydantic import BaseModel, EmailStr, field_validator


class SignupRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    terms_version_accepted: str

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Full name is required")
        return v.strip()

    @field_validator("terms_version_accepted")
    @classmethod
    def terms_must_be_provided(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Terms acceptance is required")
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool
    latest_terms_version: str | None = None

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    requires_terms_acceptance: bool = False
    current_terms_version: str | None = None


class TermsResponse(BaseModel):
    version: str
    effective_date: str
    text_en: str
    text_he: str


class TermsAcceptRequest(BaseModel):
    terms_version: str

    @field_validator("terms_version")
    @classmethod
    def must_provide(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("terms_version is required")
        return v.strip()
