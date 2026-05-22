import json
import re
import time

import dashscope

from app.config import settings

dashscope.api_key = settings.qwen_api_key

CALL_TIMEOUT_SECONDS = 180
MAX_RETRIES = 2
RETRY_BACKOFF_BASE = 2.0


def call_qwen(
    *,
    model: str = "qwen-max",
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.1,
    max_tokens: int = 4096,
) -> str:
    """Call Qwen API with timeout + exponential-backoff retry.

    Returns the raw text response. Callers are expected to parse JSON from it.
    """
    last_error = None

    for attempt in range(MAX_RETRIES + 1):
        try:
            response = dashscope.Generation.call(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=CALL_TIMEOUT_SECONDS,
            )
        except Exception as e:
            last_error = e
            if attempt < MAX_RETRIES:
                wait = RETRY_BACKOFF_BASE ** (attempt + 1)
                time.sleep(wait)
                continue
            raise RuntimeError(f"Qwen API request failed after {MAX_RETRIES + 1} attempts: {e}") from e

        if response.status_code == 200:
            return response.output.text.strip()

        last_error = RuntimeError(f"Qwen API error (status={response.status_code}): {response.message}")

        if attempt < MAX_RETRIES:
            wait = RETRY_BACKOFF_BASE ** (attempt + 1)
            time.sleep(wait)

    raise last_error  # type: ignore[misc]


def extract_json_from_response(raw: str, expected_first_char: str = "[") -> str:
    """Extract JSON substring from a model response that may contain extra text."""
    if expected_first_char == "[":
        pattern = r"\[.*\]"
    else:
        pattern = r"\{.*\}"
    match = re.search(pattern, raw, re.DOTALL)
    return match.group(0) if match else raw


def call_qwen_json(
    *,
    model: str = "qwen-max",
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.1,
    max_tokens: int = 4096,
    json_expected_first_char: str = "[",
) -> list | dict:
    """Convenience wrapper: call Qwen and return parsed JSON."""
    raw = call_qwen(
        model=model,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    clean = extract_json_from_response(raw, expected_first_char=json_expected_first_char)
    return json.loads(clean)
