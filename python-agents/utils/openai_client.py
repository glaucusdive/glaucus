"""Shared OpenAI client and model constant."""
import os
from openai import AsyncOpenAI

OPENAI_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-5.5")

_client: AsyncOpenAI | None = None


def get_openai_client() -> AsyncOpenAI:
    """Return a singleton AsyncOpenAI client, reading the key from the environment."""
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("NUXT_OPENAI_API_KEY", "")
        if not api_key:
            raise RuntimeError(
                "OpenAI API key not configured — set OPENAI_API_KEY or NUXT_OPENAI_API_KEY."
            )
        _client = AsyncOpenAI(api_key=api_key)
    return _client

