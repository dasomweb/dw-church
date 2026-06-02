"""Schema-level retry policy for LLM agents.

Network-level retries (429 / 5xx / connection errors) already happen
inside app.services.planner.llm_service._post_with_retry. This module
adds the layer above: when the LLM returns 200 OK with text that fails
to parse into the expected output schema (invalid JSON, missing fields,
wrong types), retry the prompt with a corrective hint.

The corrective retry is what catches the "silent fail" the Marketing
Strategy bug uncovered — Claude occasionally returns a JSON object with
the wrong shape, and the old code returned `{}` and moved on. With this
policy, the agent gets a second pass with explicit feedback like:
  "Your previous answer failed validation: <error>. Return only the
   exact JSON shape described above."
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from typing import TypeVar

from pydantic import BaseModel, ValidationError

from app.services.agents.shared.observability import add_note
from app.services.planner.llm_service import extract_json

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class SchemaValidationError(RuntimeError):
    """Raised when an LLM response can't be parsed into the agent's
    output schema after every retry attempt is exhausted."""


class SchemaRetryPolicy:
    """Wraps an LLM call so the prompt is retried when the response
    fails schema validation.

    Usage inside an agent:

        policy = SchemaRetryPolicy(max_retries=2)
        result = await policy.run(
            output_schema=MyOutput,
            call=lambda extra: llm_client.complete(
                LLMRequest(prompt=base_prompt + extra, ...),
                agent="my_agent",
            ),
        )

    `call` receives an `extra` string that the policy fills with the
    correction hint on retry attempts (empty on the first attempt).
    """

    def __init__(self, *, max_retries: int = 2) -> None:
        # max_retries=2 means up to 3 LLM calls total per prompt.
        # 0 = no retry, 1 = one retry, etc. Anthropic charges per call,
        # so don't bump this beyond 2-3 without thinking about budget.
        self.max_retries = max_retries

    async def run(
        self,
        *,
        output_schema: type[T],
        call: Callable[[str], Awaitable[LLMResponseLike]],
    ) -> T:
        last_error: str = ""
        for attempt in range(self.max_retries + 1):
            extra_hint = ""
            if attempt > 0 and last_error:
                extra_hint = (
                    "\n\n---\nIMPORTANT: Your previous answer failed validation:\n"
                    f"{last_error}\n"
                    "Return ONLY the exact JSON object described above. No prose, "
                    "no markdown fences, no explanation."
                )

            response = await call(extra_hint)
            text = response.text if hasattr(response, "text") else str(response)

            parsed = extract_json(text)
            if parsed is None:
                last_error = "could not parse response as JSON"
                logger.warning(
                    "schema_retry attempt=%d parse_failed text_preview=%s",
                    attempt + 1,
                    text[:200].replace("\n", " "),
                )
                add_note(f"parse_fail_attempt_{attempt + 1}")
                continue

            try:
                return output_schema.model_validate(parsed)
            except ValidationError as err:
                last_error = str(err)
                logger.warning(
                    "schema_retry attempt=%d validation_failed errors=%s",
                    attempt + 1,
                    err.error_count(),
                )
                add_note(f"validate_fail_attempt_{attempt + 1}")
                continue

        raise SchemaValidationError(
            f"LLM output failed validation after {self.max_retries + 1} attempts: "
            f"{last_error}"
        )


# Forward reference for the lambda's return type. We accept anything
# with a .text attribute so tests can pass simple stubs.
class LLMResponseLike:
    text: str
