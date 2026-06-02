"""US Census API — demographic data by ZIP code.

Fetches population, income, race, age, education, occupation data
for a given ZIP code from the American Community Survey (ACS 5-year).
Used to enrich marketing insight and content strategy with real data.
"""

import logging
import os
import re

import httpx

logger = logging.getLogger(__name__)

CENSUS_API_KEY = os.getenv("CENSUS_API_KEY", "")


def _safe_int(v: str | None) -> int:
    if not v or v == "-666666666" or v == "null":
        return 0
    try:
        return int(v)
    except (ValueError, TypeError):
        return 0


def _safe_float(v: str | None) -> float:
    if not v or v == "-666666666":
        return 0.0
    try:
        return float(v)
    except (ValueError, TypeError):
        return 0.0


def extract_zip_from_location(location: str) -> str | None:
    """Extract a 5-digit US ZIP code from a location string."""
    match = re.search(r"\b(\d{5})\b", location)
    return match.group(1) if match else None


async def fetch_census_data(zip_code: str) -> dict | None:
    """Fetch Census ACS 5-year data for a ZIP code.

    Returns structured demographic data or None if unavailable.
    """
    api_key = CENSUS_API_KEY
    if not api_key:
        logger.info("CENSUS_API_KEY not configured — skipping census data")
        return None

    variables = ",".join([
        "B01003_001E",  # Total population
        "B02001_002E",  # White
        "B02001_003E",  # Black
        "B02001_005E",  # Asian
        "B03003_003E",  # Hispanic
        "B19013_001E",  # Median household income
        "B01002_001E",  # Median age
        "B11001_001E",  # Households
        "B01001_002E",  # Male
        "B01001_026E",  # Female
        "B15003_022E",  # Bachelor's
        "B15003_023E",  # Master's
        "B15003_024E",  # Professional
        "B15003_025E",  # Doctorate
        "B15003_001E",  # Education total (25+)
    ])

    url = (
        f"https://api.census.gov/data/2022/acs/acs5"
        f"?get={variables}"
        f"&for=zip%20code%20tabulation%20area:{zip_code}"
        f"&key={api_key}"
    )

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                logger.warning("Census API returned %d for ZIP %s", resp.status_code, zip_code)
                return None

            data = resp.json()
            if len(data) < 2:
                return None

            v = data[1]
            total_pop = _safe_int(v[0])
            if total_pop == 0:
                return None

            white = _safe_int(v[1])
            black = _safe_int(v[2])
            asian = _safe_int(v[3])
            hispanic = _safe_int(v[4])
            income = _safe_int(v[5])
            age = _safe_float(v[6])
            households = _safe_int(v[7])
            male = _safe_int(v[8])
            female = _safe_int(v[9])
            bachelors = _safe_int(v[10])
            masters = _safe_int(v[11])
            professional = _safe_int(v[12])
            doctorate = _safe_int(v[13])
            edu_total = _safe_int(v[14])
            college_plus = bachelors + masters + professional + doctorate

            def pct(n: int, t: int = total_pop) -> str:
                return f"{round(n / t * 100, 1)}%" if t > 0 else "0%"

            return {
                "zipCode": zip_code,
                "totalPopulation": total_pop,
                "medianAge": age,
                "medianIncome": income,
                "households": households,
                "gender": {
                    "male": male,
                    "female": female,
                    "malePct": pct(male),
                    "femalePct": pct(female),
                },
                "race": {
                    "white": pct(white),
                    "black": pct(black),
                    "asian": pct(asian),
                    "hispanic": pct(hispanic),
                    "other": pct(max(0, total_pop - white - black - asian - hispanic)),
                },
                "education": {
                    "collegePlusPct": pct(college_plus, edu_total),
                },
                "summary": (
                    f"ZIP {zip_code}: Pop {total_pop:,} | Age {age} | "
                    f"Income ${income:,} | "
                    f"White {pct(white)}, Hispanic {pct(hispanic)}, "
                    f"Asian {pct(asian)}, Black {pct(black)} | "
                    f"College+ {pct(college_plus, edu_total)}"
                ),
            }

    except Exception as e:
        logger.warning("Census API failed for ZIP %s: %s", zip_code, e)
        return None
