"""NVIDIA Nemotron LLM for AI Mode search.

Single provider (NVIDIA) — verified working with your nvapi key.
"""

import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
import httpx

logger = logging.getLogger("search_engine.llm")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3.5-super-vl-120b-a12b")
NVIDIA_MAX_TOKENS = int(os.getenv("NVIDIA_MAX_TOKENS", "400"))  # short = fast
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")

# Shared system instruction (Google AI Mode style).
AI_MODE_INSTRUCTION = """
You are an AI search assistant. Answer using ONLY the provided page content.
Be SHORT and CONCISE — get straight to the point. Cite sources inline [1][2][3].
Never invent facts. End with a short Sources section.
"""


# ---------------------------------------------------------------------------
# NVIDIA provider
# ---------------------------------------------------------------------------
class NVIDIAProvider:
    def __init__(self, api_key: str, model: str, base_url: str):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")

    async def stream(self, prompt: str):
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": AI_MODE_INSTRUCTION},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": NVIDIA_MAX_TOKENS,
            "stream": True,
            # Nemotron streams hidden chain-of-thought in `reasoning_content`,
            # which consumes max_tokens and truncates the visible answer.
            "chat_template_kwargs": {"enable_thinking": False},
        }
        finish_reason = None
        failed = False
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(45.0)) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                        "Accept": "text/event-stream",
                    },
                    json=payload,
                ) as response:
                    if response.status_code != 200:
                        body = await response.aread()
                        logger.error(
                            "NVIDIA API error %s: %s",
                            response.status_code,
                            body.decode(errors="replace")[:300],
                        )
                        return
                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data:"):
                            continue
                        data = line[len("data:"):].strip()
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                        except json.JSONDecodeError:
                            continue
                        choices = chunk.get("choices", [])
                        if not choices:
                            continue
                        choice = choices[0]
                        delta = choice.get("delta", {})
                        content = delta.get("content")
                        if content:
                            yield content
                        if choice.get("finish_reason"):
                            finish_reason = choice["finish_reason"]
        except Exception:
            logger.exception("NVIDIA stream failed")
            failed = True

        # Tell the caller the answer is incomplete so it is never cached.
        if failed or finish_reason == "length":
            yield {"__truncated__": True}


    async def aclose(self):
        pass  # No persistent client to close


# ---------------------------------------------------------------------------
# Provider singleton
# ---------------------------------------------------------------------------
_provider: NVIDIAProvider | None = None


def get_provider() -> NVIDIAProvider | None:
    """Return the NVIDIA provider (lazily initialized)."""
    global _provider
    if _provider is None:
        if not NVIDIA_API_KEY:
            logger.warning(
                "NVIDIA_API_KEY missing. AI Mode will use local fallback."
            )
            return None
        _provider = NVIDIAProvider(NVIDIA_API_KEY, NVIDIA_MODEL, NVIDIA_BASE_URL)
    return _provider


def provider_name() -> str:
    return "nvidia" if NVIDIA_API_KEY else "none"


def is_available() -> bool:
    return bool(NVIDIA_API_KEY)


async def close_provider():
    global _provider
    _provider = None
