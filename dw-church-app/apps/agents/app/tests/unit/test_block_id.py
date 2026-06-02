"""Unit tests for Block-ID service."""

import pytest

from app.services.block_id_service import (
    generate_block_id,
    generate_next_block_id,
    generate_page_id,
    parse_block_id,
    validate_block_id,
    validate_page_id,
)


class TestGeneratePageId:
    def test_single_digit(self) -> None:
        assert generate_page_id(1) == "p01"
        assert generate_page_id(9) == "p09"

    def test_double_digit(self) -> None:
        assert generate_page_id(10) == "p10"
        assert generate_page_id(99) == "p99"

    def test_out_of_range_zero(self) -> None:
        with pytest.raises(ValueError, match="between 1 and 99"):
            generate_page_id(0)

    def test_out_of_range_hundred(self) -> None:
        with pytest.raises(ValueError, match="between 1 and 99"):
            generate_page_id(100)

    def test_negative(self) -> None:
        with pytest.raises(ValueError):
            generate_page_id(-1)


class TestGenerateBlockId:
    def test_basic(self) -> None:
        assert generate_block_id(1, 1) == "p01-b01"
        assert generate_block_id(3, 12) == "p03-b12"
        assert generate_block_id(99, 99) == "p99-b99"

    def test_page_out_of_range(self) -> None:
        with pytest.raises(ValueError):
            generate_block_id(0, 1)
        with pytest.raises(ValueError):
            generate_block_id(100, 1)

    def test_block_out_of_range(self) -> None:
        with pytest.raises(ValueError):
            generate_block_id(1, 0)
        with pytest.raises(ValueError):
            generate_block_id(1, 100)


class TestParseBlockId:
    def test_valid(self) -> None:
        result = parse_block_id("p01-b03")
        assert result.page_number == 1
        assert result.block_number == 3
        assert result.page_id == "p01"
        assert result.block_id == "p01-b03"

    def test_large_numbers(self) -> None:
        result = parse_block_id("p99-b99")
        assert result.page_number == 99
        assert result.block_number == 99

    def test_invalid_format(self) -> None:
        with pytest.raises(ValueError, match="Invalid Block-ID"):
            parse_block_id("invalid")

    def test_missing_prefix(self) -> None:
        with pytest.raises(ValueError):
            parse_block_id("01-b01")

    def test_wrong_separator(self) -> None:
        with pytest.raises(ValueError):
            parse_block_id("p01_b01")

    def test_three_digits(self) -> None:
        with pytest.raises(ValueError):
            parse_block_id("p001-b001")

    def test_empty_string(self) -> None:
        with pytest.raises(ValueError):
            parse_block_id("")


class TestValidateBlockId:
    def test_valid_ids(self) -> None:
        assert validate_block_id("p01-b01") is True
        assert validate_block_id("p12-b34") is True
        assert validate_block_id("p99-b99") is True

    def test_invalid_ids(self) -> None:
        assert validate_block_id("") is False
        assert validate_block_id("invalid") is False
        assert validate_block_id("p1-b1") is False
        assert validate_block_id("p001-b001") is False
        assert validate_block_id("P01-B01") is False
        assert validate_block_id("p01-b01-extra") is False
        assert validate_block_id("p01") is False


class TestValidatePageId:
    def test_valid(self) -> None:
        assert validate_page_id("p01") is True
        assert validate_page_id("p99") is True

    def test_invalid(self) -> None:
        assert validate_page_id("") is False
        assert validate_page_id("p1") is False
        assert validate_page_id("p001") is False
        assert validate_page_id("page01") is False


class TestGenerateNextBlockId:
    def test_first_block(self) -> None:
        assert generate_next_block_id("p01", []) == "p01-b01"

    def test_sequential(self) -> None:
        existing = ["p01-b01", "p01-b02", "p01-b03"]
        assert generate_next_block_id("p01", existing) == "p01-b04"

    def test_with_gaps(self) -> None:
        existing = ["p01-b01", "p01-b05"]
        assert generate_next_block_id("p01", existing) == "p01-b06"

    def test_ignores_other_pages(self) -> None:
        existing = ["p01-b01", "p02-b01", "p02-b02"]
        assert generate_next_block_id("p01", existing) == "p01-b02"

    def test_invalid_page_id(self) -> None:
        with pytest.raises(ValueError, match="Invalid Page ID"):
            generate_next_block_id("invalid", [])

    def test_max_blocks_reached(self) -> None:
        existing = [f"p01-b{i:02d}" for i in range(1, 100)]
        with pytest.raises(ValueError, match="Maximum block count"):
            generate_next_block_id("p01", existing)
