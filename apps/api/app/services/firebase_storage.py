from __future__ import annotations

from io import BytesIO
from pathlib import Path
from urllib.parse import quote

from google.cloud import storage
from google.oauth2 import service_account

from app.core.config import settings


class FirebaseStorageService:
    def __init__(self) -> None:
        credentials = service_account.Credentials.from_service_account_info(
            {
                "type": "service_account",
                "project_id": settings.firebase_project_id,
                "private_key_id": settings.firebase_private_key_id,
                "private_key": settings.firebase_private_key_value(),
                "client_email": settings.firebase_client_email,
                "client_id": settings.firebase_client_id,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": settings.firebase_client_x509_cert_url,
            }
        )
        self.client = storage.Client(project=settings.firebase_project_id, credentials=credentials)
        self.bucket = self.client.bucket(settings.firebase_storage_bucket)

    def upload_bytes(
        self,
        *,
        path: str,
        data: bytes,
        content_type: str,
        download_token: str,
    ) -> str:
        blob = self.bucket.blob(path)
        blob.metadata = {"firebaseStorageDownloadTokens": download_token}
        blob.upload_from_file(BytesIO(data), size=len(data), content_type=content_type)
        return self.build_download_url(path=path, download_token=download_token)

    def upload_file(
        self,
        *,
        path: str,
        local_path: str | Path,
        content_type: str,
        download_token: str,
    ) -> str:
        blob = self.bucket.blob(path)
        blob.metadata = {"firebaseStorageDownloadTokens": download_token}
        blob.upload_from_filename(str(local_path), content_type=content_type)
        return self.build_download_url(path=path, download_token=download_token)

    def delete_object(self, path: str) -> None:
        self.bucket.blob(path).delete(if_generation_match=None)

    def download_bytes(self, path: str) -> bytes:
        return self.bucket.blob(path).download_as_bytes()

    def build_download_url(self, *, path: str, download_token: str) -> str:
        encoded_path = quote(path, safe="")
        return (
            f"https://firebasestorage.googleapis.com/v0/b/{settings.firebase_storage_bucket}/o/"
            f"{encoded_path}?alt=media&token={download_token}"
        )


firebase_storage = FirebaseStorageService()
