"""Shared LLM client + model constants (OpenAI or Google AI Studio Gemini)."""
from __future__ import annotations

import os
from pathlib import Path

from openai import AsyncOpenAI
from dotenv import load_dotenv


# Ensure local scripts (for example orchestrator_smoke.py) pick up python-agents/.env
# even when they do not import main.py.
_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(_ROOT / ".env")

_LLM_PROVIDER = (os.getenv("LLM_PROVIDER", "openai") or "openai").strip().lower()

if _LLM_PROVIDER in ("google", "gemini", "google_ai_studio"):
    OPENAI_CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.0-flash")
else:
    OPENAI_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-5.5")

_client: AsyncOpenAI | None = None


def get_llm_provider() -> str:
    """Current provider key resolved from LLM_PROVIDER."""
    return _LLM_PROVIDER


def get_llm_base_url() -> str | None:
    """Provider-specific OpenAI-compatible base URL (None for OpenAI)."""
    if _LLM_PROVIDER in ("google", "gemini", "google_ai_studio"):
        return "https://generativelanguage.googleapis.com/v1beta/openai/"
    return None


def get_llm_api_key() -> str:
    """Provider-specific API key with clear local-dev error messages."""
    if _LLM_PROVIDER in ("google", "gemini", "google_ai_studio"):
        api_key = (
            os.getenv("GOOGLE_API_KEY")
            or os.getenv("GEMINI_API_KEY")
            or os.getenv("NUXT_GOOGLE_API_KEY", "")
        )
        if not api_key:
            raise RuntimeError(
                "Gemini API key not configured - set GOOGLE_API_KEY (or GEMINI_API_KEY / NUXT_GOOGLE_API_KEY)."
            )
        return api_key

    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("NUXT_OPENAI_API_KEY", "")
    if not api_key:
        raise RuntimeError(
            "OpenAI API key not configured - set OPENAI_API_KEY or NUXT_OPENAI_API_KEY."
        )
    return api_key


def get_openai_client() -> AsyncOpenAI:
    """Return a singleton OpenAI-compatible client using provider env selection."""
    global _client
    if _client is None:
        base_url = get_llm_base_url()
        api_key = get_llm_api_key()
        if base_url:
            _client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        else:
            _client = AsyncOpenAI(api_key=api_key)
    return _client

