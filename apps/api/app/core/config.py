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


def load_settings() -> Settings:
    return Settings.model_validate(os.environ)


settings = load_settings()
