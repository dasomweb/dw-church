"""Block-ID generation and management service.

Block-ID format: p{NN}-b{NN}
- p{NN}: Page identifier (p01, p02, ...)
- b{NN}: Block index within the page (b01, b02, ...)

Block-IDs are used as:
- HTML id attributes (anchor) in Gutenberg blocks
- CSS selectors (#p01-b01 { ... })
- Unique identifiers for AI prompt targeting (@block1 -> p01-b01)
"""

import re
from dataclasses import dataclass

BLOCK_ID_PATTERN = re.compile(r"^p(\d{2})-b(\d{2})$")
PAGE_ID_PATTERN = re.compile(r"^p(\d{2})$")


@dataclass(frozen=True)
class ParsedBlockId:
    """Parsed components of a Block-ID."""

    page_number: int
    block_number: int
    page_id: str
    block_id: str


def generate_page_id(page_number: int) -> str:
    """Generate a page ID from a page number.

    Args:
        page_number: Page number (1-99).

    Returns:
        Page ID string (e.g., "p01").

    Raises:
        ValueError: If page_number is out of range.
    """
    if not 1 <= page_number <= 99:
        raise ValueError(f"Page number must be between 1 and 99, got {page_number}")
    return f"p{page_number:02d}"


def generate_block_id(page_number: int, block_index: int) -> str:
    """Generate a Block-ID from page number and block index.

    Args:
        page_number: Page number (1-99).
        block_index: Block index within the page (1-99).

    Returns:
        Block-ID string (e.g., "p01-b01").

    Raises:
        ValueError: If either number is out of range.
    """
    if not 1 <= page_number <= 99:
        raise ValueError(f"Page number must be between 1 and 99, got {page_number}")
    if not 1 <= block_index <= 99:
        raise ValueError(f"Block index must be between 1 and 99, got {block_index}")
    return f"p{page_number:02d}-b{block_index:02d}"


def parse_block_id(block_id: str) -> ParsedBlockId:
    """Parse a Block-ID string into its components.

    Args:
        block_id: Block-ID string (e.g., "p01-b03").

    Returns:
        ParsedBlockId with page_number, block_number, page_id, block_id.

    Raises:
        ValueError: If the block_id format is invalid.
    """
    match = BLOCK_ID_PATTERN.match(block_id)
    if not match:
        raise ValueError(f"Invalid Block-ID format: '{block_id}'. Expected pNN-bNN.")

    page_num = int(match.group(1))
    block_num = int(match.group(2))

    return ParsedBlockId(
        page_number=page_num,
        block_number=block_num,
        page_id=f"p{page_num:02d}",
        block_id=block_id,
    )


def validate_block_id(block_id: str) -> bool:
    """Check if a string is a valid Block-ID.

    Args:
        block_id: String to validate.

    Returns:
        True if valid Block-ID format, False otherwise.
    """
    return bool(BLOCK_ID_PATTERN.match(block_id))


def validate_page_id(page_id: str) -> bool:
    """Check if a string is a valid Page ID.

    Args:
        page_id: String to validate.

    Returns:
        True if valid Page ID format, False otherwise.
    """
    return bool(PAGE_ID_PATTERN.match(page_id))


def generate_next_block_id(page_id: str, existing_block_ids: list[str]) -> str:
    """Generate the next available Block-ID for a page.

    Args:
        page_id: Page ID (e.g., "p01").
        existing_block_ids: List of existing Block-IDs for the page.

    Returns:
        Next available Block-ID.

    Raises:
        ValueError: If page_id is invalid or no more IDs available.
    """
    if not validate_page_id(page_id):
        raise ValueError(f"Invalid Page ID: '{page_id}'")

    page_num = int(page_id[1:])

    if not existing_block_ids:
        return generate_block_id(page_num, 1)

    max_index = 0
    for bid in existing_block_ids:
        parsed = parse_block_id(bid)
        if parsed.page_id == page_id:
            max_index = max(max_index, parsed.block_number)

    next_index = max_index + 1
    if next_index > 99:
        raise ValueError(f"Maximum block count (99) reached for page {page_id}")

    return generate_block_id(page_num, next_index)
