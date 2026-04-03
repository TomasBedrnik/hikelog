from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Load apps/api/.env if present (dev only). Real env vars still win.
BASE_DIR = Path(__file__).resolve().parents[2]  # .../apps/api
load_dotenv(BASE_DIR / ".env", override=False)


class Settings(BaseModel):
    google_oauth_client_id: str = Field(..., alias="GOOGLE_OAUTH_CLIENT_ID")
    firebase_project_id: str = Field(..., alias="FIREBASE_PROJECT_ID")
    firebase_private_key_id: str = Field(..., alias="FIREBASE_PRIVATE_KEY_ID")
    firebase_private_key: str = Field(..., alias="FIREBASE_PRIVATE_KEY")
    firebase_client_email: str = Field(..., alias="FIREBASE_CLIENT_EMAIL")
    firebase_client_id: str = Field(..., alias="FIREBASE_CLIENT_ID")
    firebase_client_x509_cert_url: str = Field(..., alias="FIREBASE_CLIENT_X509_CERT_URL")
    firebase_storage_bucket: str = Field(..., alias="FIREBASE_STORAGE_BUCKET")
    cors_allowed_origins_raw: str | None = Field(default=None, alias="CORS_ALLOWED_ORIGINS")
    strava_client_id: str | None = Field(default=None, alias="STRAVA_CLIENT_ID")
    strava_client_secret: str | None = Field(default=None, alias="STRAVA_CLIENT_SECRET")
    strava_redirect_uri: str | None = Field(default=None, alias="STRAVA_REDIRECT_URI")
    strava_admin_redirect_url: str | None = Field(default=None, alias="STRAVA_ADMIN_REDIRECT_URL")

    def firebase_private_key_value(self) -> str:
        return self.firebase_private_key.replace("\\n", "\n")

    def cors_allowed_origins(self) -> list[str]:
        raw = self.cors_allowed_origins_raw
        if not raw:
            return []
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    def strava_enabled(self) -> bool:
        return bool(self.strava_client_id and self.strava_client_secret and self.strava_redirect_uri)

    def strava_admin_redirect_url_value(self) -> str | None:
        if self.strava_admin_redirect_url:
            return self.strava_admin_redirect_url

        origins = self.cors_allowed_origins()
        if not origins:
            return None

        return f"{origins[0].rstrip('/')}/admin/strava"


def load_settings() -> Settings:
    return Settings.model_validate(os.environ)


settings = load_settings()
