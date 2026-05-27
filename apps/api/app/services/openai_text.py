from __future__ import annotations

from openai import OpenAI, OpenAIError

from app.core.config import settings


class OpenAIConfigurationError(RuntimeError):
    pass


class OpenAIEnhancementError(RuntimeError):
    pass


class OpenAITextService:
    def _build_client(self) -> OpenAI:
        if not settings.openai_api_key:
            raise OpenAIConfigurationError("OPENAI_API_KEY is not configured.")
        return OpenAI(api_key=settings.openai_api_key)

    def enhance_transcription(self, *, model: str, prompt: str, transcription_raw: str) -> str:
        normalized_model = model.strip()
        normalized_prompt = prompt.strip()
        normalized_transcription = transcription_raw.strip()
        if not normalized_model:
            raise OpenAIConfigurationError("OpenAI model is not configured.")
        if not normalized_prompt:
            raise OpenAIConfigurationError("AI transcription prompt is not configured.")
        if not normalized_transcription:
            raise OpenAIEnhancementError("Raw transcription is empty.")

        try:
            response = self._build_client().responses.create(
                model=normalized_model,
                input=(f"{normalized_prompt}\n\nRaw transcription:\n{normalized_transcription}"),
            )
        except OpenAIError as exc:
            raise OpenAIEnhancementError(str(exc)) from exc

        enhanced = response.output_text.strip()
        if not enhanced:
            raise OpenAIEnhancementError("OpenAI response did not include text output.")
        return enhanced


openai_text_service = OpenAITextService()
