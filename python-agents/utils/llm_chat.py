"""Unified chat helper with optional LangChain/LangSmith tracing for local dev."""
from __future__ import annotations

import os
from typing import Any

from utils.llm_client import (
    OPENAI_CHAT_MODEL,
    get_llm_api_key,
    get_llm_base_url,
    get_llm_provider,
    get_openai_client,
)


def _is_langchain_mode_enabled() -> bool:
    """Enable LangChain path when USE_LANGCHAIN=true/1/yes/on."""
    value = str(os.getenv("USE_LANGCHAIN", "false") or "false").strip().lower()
    return value in ("1", "true", "yes", "on")


def _to_langchain_messages(messages: list[dict[str, str]]) -> list[Any]:
    try:
        from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "LangChain mode requires langchain dependencies. Run `pip install -r requirements.txt`."
        ) from exc

    out: list[Any] = []
    for m in messages:
        role = (m.get("role") or "").strip().lower()
        content = m.get("content") or ""
        if role == "system":
            out.append(SystemMessage(content=content))
        elif role == "assistant":
            out.append(AIMessage(content=content))
        else:
            out.append(HumanMessage(content=content))
    return out


def _stringify_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        chunks: list[str] = []
        for item in content:
            if isinstance(item, dict):
                text = item.get("text")
                if isinstance(text, str):
                    chunks.append(text)
            elif isinstance(item, str):
                chunks.append(item)
        return "\n".join(chunks)
    return str(content)


async def run_chat_completion(
    *,
    messages: list[dict[str, str]],
    max_completion_tokens: int,
    response_format: dict[str, Any] | None = None,
    run_name: str,
    metadata: dict[str, Any] | None = None,
) -> str:
    """Run a chat completion via OpenAI SDK or LangChain based on USE_LANGCHAIN."""
    if _is_langchain_mode_enabled():
        try:
            from langchain_openai import ChatOpenAI
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "LangChain mode requires langchain-openai. Run `pip install -r requirements.txt`."
            ) from exc

        kwargs: dict[str, Any] = {
            "model": OPENAI_CHAT_MODEL,
            "api_key": get_llm_api_key(),
            "max_tokens": max_completion_tokens,
            "temperature": 0,
        }
        base_url = get_llm_base_url()
        if base_url:
            kwargs["base_url"] = base_url
        if response_format is not None:
            kwargs["model_kwargs"] = {"response_format": response_format}

        llm = ChatOpenAI(**kwargs)
        result = await llm.ainvoke(
            _to_langchain_messages(messages),
            config={
                "run_name": run_name,
                "tags": ["python-agents", get_llm_provider()],
                "metadata": metadata or {},
            },
        )
        return _stringify_content(result.content)

    client = get_openai_client()
    response = await client.chat.completions.create(
        model=OPENAI_CHAT_MODEL,
        messages=messages,
        max_completion_tokens=max_completion_tokens,
        response_format=response_format,
    )
    return response.choices[0].message.content or ""

