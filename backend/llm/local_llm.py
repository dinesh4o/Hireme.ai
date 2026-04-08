import itertools
import json
import os
from pathlib import Path
from collections.abc import Iterator
from urllib.error import URLError
from urllib.request import urlopen

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)


_groq_key_cycle: Iterator[str] | None = None


SUPPORTED_PROVIDERS = ("groq", "ollama", "lmstudio")


def _provider_order(preferred: str | None = None) -> list[str]:
    raw_provider = (preferred or os.getenv("LLM_PROVIDER", "auto")).strip().lower()

    if raw_provider in {"", "auto"}:
        return list(SUPPORTED_PROVIDERS)

    if raw_provider not in SUPPORTED_PROVIDERS:
        return list(SUPPORTED_PROVIDERS)

    return [raw_provider, *[provider for provider in SUPPORTED_PROVIDERS if provider != raw_provider]]


def _normalize_base_url(base_url: str, *, ensure_v1: bool = False) -> str:
    cleaned = base_url.rstrip("/")
    if ensure_v1 and not cleaned.endswith("/v1"):
        cleaned = f"{cleaned}/v1"
    return cleaned


def _has_groq_key() -> bool:
    raw_keys = os.getenv("GROQ_API_KEYS", "").strip()
    single_key = os.getenv("GROQ_API_KEY", "").strip()
    return bool(raw_keys or single_key)


def _fetch_json(url: str, *, timeout: float = 1.8) -> dict | None:
    try:
        with urlopen(url, timeout=timeout) as response:
            if response.status != 200:
                return None
            payload = response.read().decode("utf-8")
            return json.loads(payload)
    except (URLError, TimeoutError, OSError, json.JSONDecodeError, UnicodeDecodeError):
        return None


def _get_ollama_models(base_url: str) -> list[str]:
    payload = _fetch_json(f"{base_url}/api/tags")
    if not payload:
        return []

    models = payload.get("models", [])
    names = [str(item.get("name", "")).strip() for item in models if isinstance(item, dict)]
    return [name for name in names if name]


def _get_lmstudio_models(base_url_v1: str) -> list[str]:
    payload = _fetch_json(f"{base_url_v1}/models")
    if not payload:
        return []

    entries = payload.get("data", [])
    ids = [str(item.get("id", "")).strip() for item in entries if isinstance(item, dict)]
    return [model_id for model_id in ids if model_id]


def _resolve_model_name(configured_model: str, available_models: list[str], fallback_model: str) -> str:
    configured = configured_model.strip()
    if configured and configured in available_models:
        return configured

    if available_models:
        return available_models[0]

    return configured or fallback_model


def _get_groq_key_cycle() -> Iterator[str]:
    global _groq_key_cycle

    if _groq_key_cycle is not None:
        return _groq_key_cycle

    raw_keys = os.getenv("GROQ_API_KEYS", "").strip()
    keys = [key.strip() for key in raw_keys.split(",") if key.strip()]

    if not keys:
        single_key = os.getenv("GROQ_API_KEY", "").strip()
        if single_key:
            keys = [single_key]

    if not keys:
        raise ValueError("Missing GROQ_API_KEYS or GROQ_API_KEY in backend .env")

    _groq_key_cycle = itertools.cycle(keys)
    return _groq_key_cycle


def provider_runtime_ready(provider: str) -> bool:
    provider = provider.strip().lower()

    if provider == "groq":
        return _has_groq_key()

    if provider == "ollama":
        base_url = _normalize_base_url(os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))
        return len(_get_ollama_models(base_url)) > 0

    if provider == "lmstudio":
        base_url = _normalize_base_url(
            os.getenv("LMSTUDIO_BASE_URL", "http://127.0.0.1:1234"),
            ensure_v1=True,
        )
        return len(_get_lmstudio_models(base_url)) > 0

    return False


def get_candidate_providers(preferred: str | None = None) -> list[str]:
    ordered = _provider_order(preferred)
    ready = [provider for provider in ordered if provider_runtime_ready(provider)]

    if not ready:
        return ordered

    return [*ready, *[provider for provider in ordered if provider not in ready]]


def build_local_llm(provider: str):
    """Build a CrewAI-compatible LLM client for a specific provider."""
    from crewai import LLM

    provider = provider.strip().lower()
    temperature = float(os.getenv("LLM_TEMPERATURE", "0.2"))

    if provider == "groq":
        key_cycle = _get_groq_key_cycle()
        model_name = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant").strip() or "llama-3.1-8b-instant"

        return LLM(
            model=f"groq/{model_name}",
            api_key=next(key_cycle),
            temperature=temperature,
        )

    if provider == "ollama":
        base_url = _normalize_base_url(os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))
        model_name = _resolve_model_name(
            os.getenv("OLLAMA_MODEL", ""),
            _get_ollama_models(base_url),
            "qwen2.5-coder:7b",
        )

        return LLM(
            model=f"ollama/{model_name}",
            base_url=base_url,
            temperature=temperature,
        )

    if provider == "lmstudio":
        base_url = _normalize_base_url(
            os.getenv("LMSTUDIO_BASE_URL", "http://127.0.0.1:1234"),
            ensure_v1=True,
        )
        model_name = _resolve_model_name(
            os.getenv("LMSTUDIO_MODEL", ""),
            _get_lmstudio_models(base_url),
            "qwen2.5-coder-7b-instruct",
        )
        api_key = os.getenv("LMSTUDIO_API_KEY", "lm-studio").strip() or "lm-studio"

        return LLM(
            model=f"openai/{model_name}",
            api_key=api_key,
            base_url=base_url,
            temperature=temperature,
        )

    raise ValueError(f"Unsupported LLM provider: {provider}")
