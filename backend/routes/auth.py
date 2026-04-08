import os
from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from urllib.parse import quote, urlencode

import httpx
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field
from pymongo.errors import DuplicateKeyError

from db.mongo import get_users_collection
from security import (
    CurrentUser,
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def _jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET_KEY", "").strip()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT_SECRET_KEY is not configured.",
        )
    return secret


def _jwt_algorithm() -> str:
    return os.getenv("JWT_ALGORITHM", "HS256")


def _google_client_id() -> str:
    value = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not value:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GOOGLE_CLIENT_ID is not configured.",
        )
    return value


def _google_client_secret() -> str:
    value = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    if not value:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GOOGLE_CLIENT_SECRET is not configured.",
        )
    return value


def _google_redirect_uri() -> str:
    value = os.getenv("GOOGLE_REDIRECT_URI", "").strip()
    if not value:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GOOGLE_REDIRECT_URI is not configured.",
        )
    return value


def _frontend_oauth_success_url() -> str:
    return os.getenv(
        "FRONTEND_OAUTH_SUCCESS_URL",
        "http://localhost:5173/auth/callback",
    ).strip()


def _frontend_oauth_failure_url() -> str:
    return os.getenv(
        "FRONTEND_OAUTH_FAILURE_URL",
        "http://localhost:5173/auth",
    ).strip()


def _build_failure_redirect(reason: str) -> str:
    base_url = _frontend_oauth_failure_url()
    separator = "&" if "?" in base_url else "?"
    return f"{base_url}{separator}reason={quote(reason)}"


def _create_google_state_token() -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "type": "google_oauth_state",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=10)).timestamp()),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=_jwt_algorithm())


def _verify_google_state_token(state_token: str) -> None:
    try:
        payload = jwt.decode(
            state_token,
            _jwt_secret(),
            algorithms=[_jwt_algorithm()],
        )
    except JWTError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google OAuth state token.",
        ) from error

    if payload.get("type") != "google_oauth_state":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google OAuth state payload.",
        )


def _build_google_authorization_url() -> str:
    query_string = urlencode(
        {
            "client_id": _google_client_id(),
            "redirect_uri": _google_redirect_uri(),
            "response_type": "code",
            "scope": "openid email profile",
            "state": _create_google_state_token(),
            "prompt": "select_account",
            "access_type": "offline",
            "include_granted_scopes": "true",
        }
    )
    return f"{GOOGLE_AUTH_URL}?{query_string}"


def _upsert_google_user(user_info: dict[str, Any]) -> dict[str, Any]:
    email = str(user_info.get("email", "")).strip().lower()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account did not return an email address.",
        )

    name = str(user_info.get("name", "")).strip() or "Google User"
    google_sub = str(user_info.get("sub", "")).strip()
    now = datetime.now(timezone.utc)

    users = get_users_collection()
    existing_user = users.find_one({"email": email})

    if existing_user:
        update_fields = {
            "name": name,
            "auth_provider": "google",
            "auth_provider_sub": google_sub,
            "updated_at": now,
        }
        users.update_one({"_id": existing_user["_id"]}, {"$set": update_fields})
        existing_user.update(update_fields)
        return existing_user

    new_user = {
        "name": name,
        "email": email,
        "password_hash": "",
        "auth_provider": "google",
        "auth_provider_sub": google_sub,
        "created_at": now,
        "updated_at": now,
    }

    try:
        insert_result = users.insert_one(new_user)
        new_user["_id"] = insert_result.inserted_id
        return new_user
    except DuplicateKeyError:
        existing_user = users.find_one({"email": email})
        if existing_user is None:
            raise

        users.update_one(
            {"_id": existing_user["_id"]},
            {
                "$set": {
                    "auth_provider": "google",
                    "auth_provider_sub": google_sub,
                    "updated_at": now,
                }
            },
        )
        existing_user["auth_provider"] = "google"
        existing_user["auth_provider_sub"] = google_sub
        existing_user["updated_at"] = now
        return existing_user


class SignUpRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class AuthUser(BaseModel):
    id: str
    name: str
    email: EmailStr


class AuthResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: AuthUser


def _to_auth_user(document: dict) -> AuthUser:
    return AuthUser(
        id=str(document["_id"]),
        name=document.get("name", ""),
        email=document["email"],
    )


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignUpRequest) -> AuthResponse:
    users = get_users_collection()

    normalized_email = payload.email.lower().strip()
    user_document = {
        "name": payload.name.strip(),
        "email": normalized_email,
        "password_hash": get_password_hash(payload.password),
        "auth_provider": "password",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    try:
        insert_result = users.insert_one(user_document)
    except DuplicateKeyError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        ) from error

    created_user = {
        **user_document,
        "_id": insert_result.inserted_id,
    }
    access_token = create_access_token(str(insert_result.inserted_id), normalized_email)

    return AuthResponse(access_token=access_token, user=_to_auth_user(created_user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest) -> AuthResponse:
    users = get_users_collection()

    normalized_email = payload.email.lower().strip()
    user = users.find_one({"email": normalized_email})

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if user.get("auth_provider") == "google" and not user.get("password_hash"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses Google sign-in. Please continue with Google.",
        )

    if not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    access_token = create_access_token(str(user["_id"]), normalized_email)
    return AuthResponse(access_token=access_token, user=_to_auth_user(user))


@router.get("/me", response_model=AuthUser)
def get_profile(current_user: CurrentUser = Depends(get_current_user)) -> AuthUser:
    return AuthUser(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
    )


@router.get("/google/login")
def google_login() -> RedirectResponse:
    return RedirectResponse(url=_build_google_authorization_url(), status_code=status.HTTP_302_FOUND)


@router.get("/google/callback")
def google_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
) -> RedirectResponse:
    if error:
        return RedirectResponse(
            url=_build_failure_redirect(error),
            status_code=status.HTTP_302_FOUND,
        )

    if not code or not state:
        return RedirectResponse(
            url=_build_failure_redirect("missing_code_or_state"),
            status_code=status.HTTP_302_FOUND,
        )

    try:
        _verify_google_state_token(state)
    except HTTPException:
        return RedirectResponse(
            url=_build_failure_redirect("invalid_state"),
            status_code=status.HTTP_302_FOUND,
        )

    try:
        token_response = httpx.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": _google_client_id(),
                "client_secret": _google_client_secret(),
                "redirect_uri": _google_redirect_uri(),
                "grant_type": "authorization_code",
            },
            timeout=15.0,
        )
        token_response.raise_for_status()
        token_payload = token_response.json()
        google_access_token = token_payload.get("access_token")
        if not isinstance(google_access_token, str) or not google_access_token:
            raise RuntimeError("Missing Google access token.")

        user_info_response = httpx.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {google_access_token}"},
            timeout=15.0,
        )
        user_info_response.raise_for_status()
        user_info = user_info_response.json()

        app_user = _upsert_google_user(user_info)
        app_token = create_access_token(str(app_user["_id"]), app_user["email"])
        success_redirect = f"{_frontend_oauth_success_url()}#token={quote(app_token)}"

        return RedirectResponse(url=success_redirect, status_code=status.HTTP_302_FOUND)
    except Exception as error:
        with open("oauth_err.log", "a") as f:
            if 'token_response' in locals():
                f.write(f"GOOGLE RESPONSE: {token_response.text}\n")
            f.write(f"ERROR: {error}\n")
            import traceback
            f.write(traceback.format_exc())
            f.write("\n---\n")
            
        print("GOOGLE OAUTH ERROR:", error)
        return RedirectResponse(
            url=_build_failure_redirect("oauth_exchange_failed"),
            status_code=status.HTTP_302_FOUND,
        )
