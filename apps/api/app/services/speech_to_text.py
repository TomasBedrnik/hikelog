from __future__ import annotations

from pathlib import Path
from urllib.parse import unquote, urlparse

from google.api_core.client_options import ClientOptions
from google.api_core.exceptions import GoogleAPICallError
from google.cloud import speech_v2
from google.oauth2 import service_account

from app.core.config import settings


class SpeechToTextConfigurationError(RuntimeError):
    pass


class SpeechToTextTranscriptionError(RuntimeError):
    pass


def _service_account_info_from_env() -> dict[str, str] | None:
    values = {
        "project_id": settings.google_cloud_project_id,
        "private_key_id": settings.google_cloud_private_key_id,
        "private_key": settings.google_cloud_private_key,
        "client_email": settings.google_cloud_client_email,
        "client_id": settings.google_cloud_client_id,
        "client_x509_cert_url": settings.google_cloud_client_x509_cert_url,
    }
    if not any(values.values()):
        return None

    missing = [key for key, value in values.items() if not value]
    if missing:
        missing_list = ", ".join(sorted(missing))
        raise SpeechToTextConfigurationError(
            f"Incomplete GOOGLE_CLOUD_* credentials. Missing: {missing_list}."
        )

    return {
        "type": "service_account",
        "project_id": values["project_id"] or "",
        "private_key_id": values["private_key_id"] or "",
        "private_key": settings.google_cloud_private_key_value(),
        "client_email": values["client_email"] or "",
        "client_id": values["client_id"] or "",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": values["client_x509_cert_url"] or "",
    }


def build_gcs_uri(*, storage_path: str | None, audio_url: str | None) -> str:
    normalized_path = (storage_path or "").lstrip("/")
    if normalized_path:
        return f"gs://{settings.firebase_storage_bucket}/{normalized_path}"

    if not audio_url:
        raise SpeechToTextConfigurationError("Audio file path is missing.")

    parsed = urlparse(audio_url)
    path_parts = parsed.path.split("/o/", maxsplit=1)
    if len(path_parts) != 2:
        raise SpeechToTextConfigurationError("Audio URL cannot be converted to a gs:// URI.")

    decoded_path = unquote(path_parts[1]).lstrip("/")
    if not decoded_path:
        raise SpeechToTextConfigurationError("Audio URL does not contain a storage object path.")

    return f"gs://{settings.firebase_storage_bucket}/{decoded_path}"


class SpeechToTextService:
    def _build_client(self) -> tuple[speech_v2.SpeechClient, str]:
        service_account_info = _service_account_info_from_env()
        project_id = settings.google_cloud_project_id_value()
        location = settings.speech_to_text_location.strip() or "global"

        if service_account_info is not None:
            credentials = service_account.Credentials.from_service_account_info(
                service_account_info
            )
            project_id = service_account_info["project_id"]
        elif settings.google_application_credentials:
            credentials = None
            credentials_path = Path(settings.google_application_credentials)
            if not credentials_path.exists():
                raise SpeechToTextConfigurationError(
                    "GOOGLE_APPLICATION_CREDENTIALS points to a missing file."
                )
        else:
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

        client_options = (
            ClientOptions(api_endpoint=f"{location}-speech.googleapis.com")
            if location != "global"
            else None
        )
        return (
            speech_v2.SpeechClient(credentials=credentials, client_options=client_options),
            project_id,
        )

    def transcribe_gcs_uri(
        self,
        *,
        gcs_uri: str,
        language_codes: list[str],
        model: str,
        enable_automatic_punctuation: bool,
        profanity_filter: bool,
        timeout: float = 900.0,
    ) -> str:
        if not language_codes:
            raise SpeechToTextConfigurationError("At least one language code is required.")

        normalized_model = model.strip()
        if not normalized_model:
            raise SpeechToTextConfigurationError("Speech-to-Text model is required.")

        client, project_id = self._build_client()
        location = settings.speech_to_text_location.strip() or "global"
        recognizer = f"projects/{project_id}/locations/{location}/recognizers/_"

        try:
            operation = client.batch_recognize(
                request={
                    "recognizer": recognizer,
                    "config": {
                        "auto_decoding_config": {},
                        "language_codes": language_codes,
                        "model": normalized_model,
                        "features": {
                            "enable_automatic_punctuation": enable_automatic_punctuation,
                            "profanity_filter": profanity_filter,
                        },
                    },
                    "files": [{"uri": gcs_uri}],
                    "recognition_output_config": {"inline_response_config": {}},
                }
            )
            response = operation.result(timeout=timeout)
        except GoogleAPICallError as exc:
            raise SpeechToTextTranscriptionError(str(exc)) from exc
        except Exception as exc:
            raise SpeechToTextTranscriptionError(f"Speech transcription failed: {exc}") from exc

        file_result = response.results.get(gcs_uri)
        print(file_result)
        if file_result is None or not file_result.inline_result:
            raise SpeechToTextTranscriptionError("Speech response did not include inline results.")

        transcript_parts: list[str] = []
        for result in file_result.inline_result.transcript.results:
            if not result.alternatives:
                continue
            transcript = result.alternatives[0].transcript.strip()
            if transcript:
                transcript_parts.append(transcript)

        if not transcript_parts:
            raise SpeechToTextTranscriptionError("Speech response did not include transcript text.")

        return "\n".join(transcript_parts)


speech_to_text_service = SpeechToTextService()
