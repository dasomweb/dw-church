"""Site Crawler — deep analysis of reference/competitor websites.

Crawls ALL pages of a site (following internal navigation links),
extracts page structure, sections, headings, content patterns,
and returns a structured analysis for the Planner pipeline.
"""

import asyncio
import logging
import re
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)

MAX_PAGES = 30  # Safety limit per site
TIMEOUT = 15.0
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; DWBuilder/1.0; +https://dwsitebuilder.com)",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9,ko;q=0.8",
}

# Skip these URL patterns
SKIP_PATTERNS = re.compile(
    r"\.(pdf|jpg|jpeg|png|gif|svg|webp|ico|css|js|zip|mp4|mp3|woff|woff2|ttf|eot)$"
    r"|/wp-admin|/wp-login|/wp-json|/feed|/cart|/checkout|/my-account"
    r"|/login|/register|/signup|#|mailto:|tel:|javascript:",
    re.IGNORECASE,
)


def _same_domain(url: str, base_domain: str) -> bool:
    """Check if URL belongs to the same domain."""
    parsed = urlparse(url)
    return parsed.netloc == base_domain or parsed.netloc == ""


def _normalize_url(url: str, base_url: str) -> str | None:
    """Normalize and validate a URL."""
    if not url or SKIP_PATTERNS.search(url):
        return None
    absolute = urljoin(base_url, url)
    parsed = urlparse(absolute)
    # Remove fragment, query, and trailing slash
    path = parsed.path.rstrip("/") or "/"
    clean = f"{parsed.scheme}://{parsed.netloc}{path}"
    if not clean or len(clean) > 500:
        return None
    return clean


def _extract_nav_links(soup: BeautifulSoup, base_url: str, base_domain: str) -> list[str]:
    """Extract navigation links from the page."""
    links = set()

    # Priority: nav elements, header links, main menu
    nav_areas = soup.find_all(["nav", "header"])
    if not nav_areas:
        nav_areas = [soup]

    for area in nav_areas:
        for a in area.find_all("a", href=True):
            href = a["href"]
            normalized = _normalize_url(href, base_url)
            if normalized and _same_domain(normalized, base_domain):
                links.add(normalized)

    # Also get links from footer (often has sitemap-like structure)
    footer = soup.find("footer")
    if footer:
        for a in footer.find_all("a", href=True):
            normalized = _normalize_url(a["href"], base_url)
            if normalized and _same_domain(normalized, base_domain):
                links.add(normalized)

    return list(links)


def _extract_page_structure(soup: BeautifulSoup, url: str) -> dict:
    """Extract page text for AI analysis. No HTML structure parsing — AI does all analysis."""

    # Title
    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else ""

    # Meta description
    meta_desc = ""
    meta = soup.find("meta", attrs={"name": "description"})
    if meta and isinstance(meta, Tag):
        meta_desc = meta.get("content", "") or ""

    # Extract clean page text for AI — skip noise elements
    sections: list[dict] = []  # Will be filled by AI later
    page_text = ""

    # Find main content area
    main = soup.find("main") or soup.find("article") or soup.find(id="content") or soup.find(role="main")
    body = main or soup.body

    if body:
        skip_tags = {"nav", "script", "style", "footer", "header", "noscript", "iframe", "svg", "form", "aside"}
        skip_classes = re.compile(r"nav|menu|sidebar|footer|header|widget|cookie|popup|modal|banner", re.I)

        def _extract_text(element: Tag) -> list[str]:
            """Recursively extract text, skipping nav/menu/footer elements."""
            lines: list[str] = []
            for child in element.children:
                if isinstance(child, str):
                    t = child.strip()
                    if t and len(t) > 3:
                        lines.append(t)
                elif isinstance(child, Tag):
                    # Skip unwanted tags
                    if child.name in skip_tags:
                        continue
                    # Skip elements with nav/menu classes
                    cls = " ".join(child.get("class", []))
                    if skip_classes.search(cls):
                        continue
                    # Recurse
                    lines.extend(_extract_text(child))
            return lines

        raw_lines = _extract_text(body)
        # Filter short/duplicate lines
        seen: set[str] = set()
        clean_lines: list[str] = []
        for line in raw_lines:
            if len(line) < 5:
                continue
            key = line.lower().strip()[:60]
            if key in seen:
                continue
            seen.add(key)
            clean_lines.append(line)

        page_text = "\n".join(clean_lines[:150])[:3000]

    # Navigation items (this page's contribution to site structure)
    nav_items = []
    nav = soup.find("nav")
    if nav:
        for a in nav.find_all("a", href=True):
            text = a.get_text(strip=True)
            if text and len(text) < 50:
                nav_items.append({"text": text, "href": a["href"]})

    # Features/services mentioned
    features = []
    for li in (soup).find_all("li"):
        text = li.get_text(strip=True)
        if 20 < len(text) < 200:
            features.append(text)

    # CTAs / buttons
    ctas = []
    for btn in (soup).find_all(
        ["a", "button"],
        class_=re.compile(r"btn|button|cta", re.IGNORECASE),
    ):
        text = btn.get_text(strip=True)
        if text and len(text) < 50:
            ctas.append(text)

    return {
        "url": url,
        "title": title,
        "metaDescription": meta_desc,
        "sections": sections,
        "pageText": page_text,
        "navItems": nav_items[:20],
        "ctas": list(set(ctas))[:8],
    }


def _analyze_section(element: Tag) -> dict | None:
    """Analyze a section → block-ready structure.

    Returns data mapped to Gutenberg block fields:
    title, subtitle, description, buttonText, items[]
    """
    # Skip nav, header, footer elements
    if element.name in ("nav", "header", "footer"):
        return None
    classes_str = " ".join(element.get("class", []))
    if re.search(r"\bnav\b|navbar|menu|header|footer|sidebar|widget", classes_str, re.I):
        return None

    # Remove nested nav/menu elements before extracting text
    for nav in element.find_all(["nav"]):
        nav.extract()

    text = element.get_text(strip=True)
    if len(text) < 30:
        return None

    element_id = element.get("id", "")

    # ── Extract block-ready content ──

    # Title: first h1 or h2 (not inside nav)
    title = ""
    for h in element.find_all(["h1", "h2"], recursive=True):
        t = h.get_text(strip=True)
        if t and len(t) > 3:
            title = t
            break

    # Subtitle: second heading or first short paragraph
    subtitle = ""
    headings_all = [
        h.get_text(strip=True)
        for h in element.find_all(["h2", "h3"])
        if h.get_text(strip=True) and h.get_text(strip=True) != title
    ]
    if headings_all:
        subtitle = headings_all[0]

    # Description: collect paragraph text (skip very short or menu-like text)
    all_paragraphs = []
    for p in element.find_all("p"):
        p_text = p.get_text(strip=True)
        # Skip menu-like or link-list paragraphs
        if p_text and len(p_text) > 30 and not re.search(r"^(Home|About|Contact|Menu|Products|Services)\b", p_text):
            all_paragraphs.append(p_text)
    description = " ".join(all_paragraphs[:3])[:600]

    if not subtitle and all_paragraphs:
        first_p = all_paragraphs[0]
        if len(first_p) < 120:
            subtitle = first_p
            description = " ".join(all_paragraphs[1:3])[:600]

    # Skip sections that are just navigation menus (no real content)
    if not title and not description:
        return None

    # Buttons / CTAs
    buttons = []
    for btn in element.find_all(["a", "button"]):
        btn_text = btn.get_text(strip=True)
        if not btn_text or len(btn_text) > 40 or len(btn_text) < 3:
            continue
        btn_class = " ".join(btn.get("class", []))
        if re.search(r"btn|button|cta", btn_class, re.I) or btn.name == "button":
            if btn_text not in buttons:
                buttons.append(btn_text)
    button_text = buttons[0] if buttons else ""

    # Items: extract repeating card/column content
    items: list[dict] = []
    seen_items: set[str] = set()
    columns = element.find_all(
        class_=re.compile(r"col-|card|item|feature|member|plan|price", re.I),
        recursive=True,
    )
    for col in columns[:8]:
        # Skip if it's a nav or menu item
        col_classes = " ".join(col.get("class", []))
        if re.search(r"nav|menu|sidebar", col_classes, re.I):
            continue

        col_heading = ""
        for h in col.find_all(["h3", "h4", "h5"]):
            t = h.get_text(strip=True)
            if t and len(t) > 2:
                col_heading = t
                break
        col_desc = ""
        for p in col.find_all("p"):
            t = p.get_text(strip=True)
            if t and len(t) > 15:
                col_desc = t[:200]
                break

        key = col_heading.lower()[:40]
        if col_heading and key not in seen_items:
            seen_items.add(key)
            items.append({"title": col_heading, "description": col_desc})

    # Section type
    combined = f"{classes_str} {element_id} {title} {subtitle}"
    section_type = _guess_section_type(combined, text)

    # Images
    image_count = len(element.find_all("img"))

    return {
        "type": section_type,
        # Block-ready fields
        "title": title,
        "subtitle": subtitle,
        "description": description,
        "buttonText": button_text,
        "items": items[:8],
        # Metadata
        "imageCount": image_count,
        "estimatedColumns": _estimate_columns(element),
    }


def _guess_section_type(context: str, content: str = "") -> str:
    """Guess section type based on class names, IDs, and content."""
    ctx = (context + " " + content).lower()

    patterns = [
        (r"hero|banner|jumbotron|masthead|splash", "hero"),
        (r"feature|benefit|advantage|why.?choose", "features"),
        (r"about|story|mission|who.?we|our.?history", "about"),
        (r"service|what.?we.?do|solution|offer", "services"),
        (r"testimonial|review|feedback|what.?.*say|client", "testimonials"),
        (r"pricing|plan|package|cost", "pricing"),
        (r"team|staff|people|member", "team"),
        (r"faq|question|ask|q\s*&\s*a", "faq"),
        (r"contact|get.?in.?touch|reach|email|phone", "contact"),
        (r"gallery|portfolio|showcase|work|project", "gallery"),
        (r"blog|news|article|post|latest", "blog"),
        (r"cta|call.?to.?action|get.?start|sign.?up|try|book|reserve", "cta"),
        (r"stats|number|counter|achievement|metric", "stats"),
        (r"partner|client|logo|trust|brand", "logo-grid"),
        (r"footer|copyright|social", "footer"),
    ]

    for pattern, section_type in patterns:
        if re.search(pattern, ctx):
            return section_type

    return "content"


def _estimate_columns(element: Tag) -> int:
    """Estimate the number of visual columns in a section."""
    # Check for grid/flexbox children
    children = [c for c in element.children if isinstance(c, Tag)]
    if not children:
        return 1

    # Look for column-like structures
    cols = element.find_all(
        class_=re.compile(r"col-|column|grid|card", re.I),
        recursive=False,
    )
    if cols:
        return min(len(cols), 6)

    # Check direct children with similar structure
    direct_divs = [c for c in children if c.name == "div"]
    if 2 <= len(direct_divs) <= 6:
        # Check if they have similar content structure
        lengths = [len(d.get_text(strip=True)) for d in direct_divs]
        if lengths and max(lengths) < 3 * min(max(lengths, default=1), 1):
            return len(direct_divs)

    return 1


async def _fetch_with_playwright(url: str) -> str | None:
    """Fetch page HTML using Playwright (headless Chromium) for JS-rendered sites."""
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, wait_until="networkidle", timeout=20000)
            html = await page.content()
            await browser.close()
            return html
    except Exception as e:
        logger.warning("Playwright fetch failed for %s: %s", url, e)
        return None


async def crawl_site(url: str) -> dict:
    """Crawl an entire website and return structured analysis.

    Uses httpx first; falls back to Playwright for JS-rendered sites.
    """
    parsed = urlparse(url)
    base_domain = parsed.netloc
    root_url = url.rstrip("/")

    visited: set[str] = set()
    to_visit: list[str] = [root_url]
    pages: list[dict] = []
    all_nav_items: list[dict] = []
    use_playwright = False  # Auto-detect after first page

    async with httpx.AsyncClient(
        timeout=TIMEOUT,
        headers=HEADERS,
        follow_redirects=True,
        limits=httpx.Limits(max_connections=5),
    ) as client:
        max_pages = MAX_PAGES
        while to_visit and len(visited) < max_pages:
            current_url = to_visit.pop(0)
            if current_url in visited:
                continue
            visited.add(current_url)

            try:
                resp = await client.get(current_url)
                if resp.status_code != 200:
                    continue
                content_type = resp.headers.get("content-type", "")
                if "text/html" not in content_type:
                    continue

                html_text = resp.text

                # If already in Playwright mode, use Playwright
                if use_playwright:
                    pw_html = await _fetch_with_playwright(current_url)
                    if pw_html:
                        html_text = pw_html

                soup = BeautifulSoup(html_text, "lxml")
                page_data = _extract_page_structure(soup, current_url)

                # Auto-detect JS-rendered site on first page
                if len(pages) == 0 and len(page_data.get("pageText", "")) < 100:
                    logger.info("JS site detected (%d chars), trying Playwright: %s",
                                len(page_data.get("pageText", "")), current_url)
                    use_playwright = True
                    max_pages = min(max_pages, 15)
                    pw_html = await _fetch_with_playwright(current_url)
                    if pw_html and len(pw_html) > len(html_text):
                        soup = BeautifulSoup(pw_html, "lxml")
                        page_data = _extract_page_structure(soup, current_url)
                        logger.info("Playwright success: %d chars", len(page_data.get("pageText", "")))

                # Filter artifacts
                page_text = page_data.get("pageText", "")
                if page_text:
                    filtered = "\n".join(
                        line for line in page_text.split("\n")
                        if not re.match(r"^\s*(end\s+\w|Global site tag|<!--)", line, re.I)
                    ).strip()
                    page_data["pageText"] = filtered

                # Skip duplicate pages
                page_title = page_data.get("title", "").strip().lower()
                if page_title and any(
                    p.get("title", "").strip().lower() == page_title for p in pages
                ):
                    continue
                # Skip empty pages
                if len(page_data.get("pageText", "")) < 30 and not page_data.get("title"):
                    continue

                pages.append(page_data)

                # Collect nav items from first page
                if len(pages) == 1:
                    all_nav_items = page_data.get("navItems", [])

                # Discover more pages
                new_links = _extract_nav_links(soup, current_url, base_domain)
                for link in new_links:
                    if link not in visited and link not in to_visit:
                        to_visit.append(link)

                logger.info("Crawled %s (%d sections)", current_url, len(page_data["sections"]))

            except Exception as e:
                logger.warning("Failed to crawl %s: %s", current_url, e)
                continue

    # Build site-level summary
    all_section_types: dict[str, int] = {}
    all_ctas: list[str] = []
    total_sections = 0

    for page in pages:
        for sec in page.get("sections", []):
            st = sec.get("type", "content")
            all_section_types[st] = all_section_types.get(st, 0) + 1
            total_sections += 1
        all_ctas.extend(page.get("ctas", []))

    return {
        "siteUrl": root_url,
        "pagesAnalyzed": len(pages),
        "totalSections": total_sections,
        "navigation": all_nav_items,
        "commonSectionTypes": dict(sorted(all_section_types.items(), key=lambda x: -x[1])),
        "commonCTAs": list(set(all_ctas))[:10],
        "pages": pages,
    }


async def crawl_multiple_sites(urls: list[str]) -> dict:
    """Crawl multiple reference sites and combine analysis.

    Returns combined patterns across all sites.
    """
    # Crawl all reference sites concurrently — each crawl_site is many
    # HTTP fetches (up to MAX_PAGES per site) so wall-time savings are
    # significant. Cap at 5 sites; gather with return_exceptions so one
    # bad URL doesn't drop the others.
    capped_urls = urls[:5]
    crawl_results = await asyncio.gather(
        *[crawl_site(u) for u in capped_urls],
        return_exceptions=True,
    )
    site_analyses = []
    for url, result in zip(capped_urls, crawl_results):
        if isinstance(result, Exception):
            logger.error("Failed to crawl site %s: %s", url, result)
            continue
        site_analyses.append(result)

    if not site_analyses:
        return {"sites": [], "commonPatterns": {}}

    # Find common patterns across sites
    combined_section_types: dict[str, int] = {}
    combined_page_names: dict[str, int] = {}
    combined_ctas: list[str] = []
    all_sections_by_page: dict[str, list[list[str]]] = {}

    for site in site_analyses:
        for st, count in site.get("commonSectionTypes", {}).items():
            combined_section_types[st] = combined_section_types.get(st, 0) + count
        combined_ctas.extend(site.get("commonCTAs", []))

        for page in site.get("pages", []):
            # Normalize page name from URL
            path = urlparse(page["url"]).path.strip("/")
            page_name = path.split("/")[-1] if path else "home"
            combined_page_names[page_name] = combined_page_names.get(page_name, 0) + 1

            # Track section compositions per page type
            section_types = [s["type"] for s in page.get("sections", [])]
            if page_name not in all_sections_by_page:
                all_sections_by_page[page_name] = []
            all_sections_by_page[page_name].append(section_types)

    # ── AI Analysis: Let Claude analyze the crawled content ──
    ai_analysis = ""
    try:
        from app.services.planner.llm_service import call_llm, extract_json

        # Build page content summary for AI
        site_texts = []
        for site in site_analyses:
            site_texts.append(f"\n=== SITE: {site['siteUrl']} ===")
            site_texts.append(f"Navigation: {', '.join(n.get('text','') for n in site.get('navigation',[])[:15])}")
            for page in site.get("pages", [])[:15]:
                path = urlparse(page["url"]).path or "/"
                site_texts.append(f"\n--- Page: {page.get('title','')} ({path}) ---")
                page_text = page.get("pageText", "")
                if page_text:
                    site_texts.append(page_text[:1500])

        all_text = "\n".join(site_texts)[:12000]  # Cap total

        analysis_prompt = f"""Analyze these competitor/reference websites for a wholesale horticulture business.

NOTE: Some sites use JavaScript rendering, so page content may be limited.
In that case, use the navigation structure and page titles to infer what each page likely contains.

For each site, provide:

1. **Site Overview**: What the business does, their positioning, target market
2. **Navigation Structure**: Main menu items and page hierarchy — what pages they have and why
3. **Page-by-Page Analysis**: For each page:
   - Page purpose (why it exists, what information it provides)
   - What sections it likely has (hero, features, about, product details, testimonials, etc.)
   - What content would be on this page based on the page title and site context
   - What CTAs would be appropriate
4. **Common Patterns**: Section types used across pages, CTA patterns, content strategy
5. **Strengths**: What they do well in terms of content and structure
6. **Gaps/Opportunities**: What's missing or could be done better

{all_text}

Write a detailed analysis in English. Be specific — mention actual page names, section content, and copywriting techniques used."""

        ai_analysis = await call_llm(analysis_prompt, max_tokens=4000, model="gemini")
        logger.info("AI site analysis completed (%d chars)", len(ai_analysis))
    except Exception as e:
        logger.warning("AI site analysis failed: %s", e)

    # Also parse AI analysis into structured sections per site
    ai_sections_by_site: dict[str, list] = {}
    if ai_analysis:
        try:
            parse_prompt = f"""Based on this analysis, extract the page structure for each site.

{ai_analysis[:6000]}

Return JSON only:
{{
  "site_url_1": [
    {{"page": "Home", "path": "/", "purpose": "...", "sections": [
      {{"type": "hero", "title": "...", "description": "...", "buttonText": "..."}}
    ]}}
  ]
}}"""
            parsed = await call_llm(parse_prompt, max_tokens=4000, model="gemini")
            ai_sections_by_site = extract_json(parsed) or {}
        except Exception:
            pass

    # Merge AI-parsed sections into site data
    for site in site_analyses:
        site_url = site["siteUrl"]
        ai_pages = ai_sections_by_site.get(site_url, [])
        if isinstance(ai_pages, list):
            for ai_page in ai_pages:
                if not isinstance(ai_page, dict):
                    continue
                # Find matching crawled page and add AI sections
                page_path = ai_page.get("path", "")
                for crawled_page in site.get("pages", []):
                    if page_path and page_path in crawled_page.get("url", ""):
                        if not crawled_page.get("sections"):
                            crawled_page["sections"] = ai_page.get("sections", [])
                            crawled_page["purpose"] = ai_page.get("purpose", "")
                        break

        site["aiAnalysis"] = ai_analysis if site == site_analyses[0] else ""
        # Recount sections
        site["totalSections"] = sum(len(p.get("sections", [])) for p in site.get("pages", []))

    return {
        "sites": site_analyses,
        "aiAnalysis": ai_analysis,
        "commonPatterns": {
            "sectionTypes": dict(sorted(combined_section_types.items(), key=lambda x: -x[1])),
            "pageNames": dict(sorted(combined_page_names.items(), key=lambda x: -x[1])),
            "ctas": list(set(combined_ctas))[:10],
        },
    }


def format_crawl_for_prompt(crawl_result: dict) -> str:
    """Format crawl results for AI content generation prompt."""
    lines = ["[REFERENCE SITE ANALYSIS]"]

    # Include AI analysis if available
    ai_analysis = crawl_result.get("aiAnalysis", "")
    if ai_analysis:
        lines.append(ai_analysis[:5000])

    # Include raw page content as writing reference
    for site in crawl_result.get("sites", []):
        for page in site.get("pages", [])[:10]:
            page_text = page.get("pageText", "")
            if page_text and len(page_text) > 50:
                path = urlparse(page["url"]).path or "/"
                lines.append(f"\n--- {page.get('title','')} ({path}) ---")
                lines.append(page_text[:1000])

    lines.append("\nINSTRUCTIONS: Use the above as WRITING REFERENCE for our website content.")

    return "\n".join(lines)[:15000]  # Cap total prompt context
