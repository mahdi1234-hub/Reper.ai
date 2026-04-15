"""
Scraper Service
Web scraping using httpx, BeautifulSoup, and trafilatura for
extracting contact information and lead data from web pages.
"""

import re
from typing import Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

try:
    import trafilatura
except ImportError:
    trafilatura = None


class ScraperService:
    """
    Web scraping service for extracting:
    - Email addresses from web pages
    - Contact information
    - Company data from about/team pages
    - Article/content extraction
    """

    EMAIL_PATTERN = re.compile(
        r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    )

    PHONE_PATTERN = re.compile(
        r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}"
    )

    LINKEDIN_PATTERN = re.compile(
        r"(?:https?://)?(?:www\.)?linkedin\.com/in/[\w-]+/?",
        re.IGNORECASE,
    )

    TWITTER_PATTERN = re.compile(
        r"(?:https?://)?(?:www\.)?(?:twitter\.com|x\.com)/[\w]+/?",
        re.IGNORECASE,
    )

    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=20.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
        )

    async def scrape_page(
        self,
        url: str,
        extract_contacts: bool = True,
        extract_emails: bool = True,
    ) -> dict:
        """Scrape a web page for contact information."""
        result = {
            "url": url,
            "status": "error",
            "title": "",
            "description": "",
            "emails": [],
            "phones": [],
            "linkedin_profiles": [],
            "twitter_profiles": [],
            "content_excerpt": "",
            "links": [],
        }

        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                result["status"] = f"http_{response.status_code}"
                return result

            html = response.text
            soup = BeautifulSoup(html, "lxml")

            # Title
            title_tag = soup.find("title")
            result["title"] = title_tag.get_text(strip=True) if title_tag else ""

            # Meta description
            meta_desc = soup.find("meta", attrs={"name": "description"})
            if meta_desc:
                result["description"] = meta_desc.get("content", "")

            if extract_emails:
                # Extract emails from page
                emails = set(self.EMAIL_PATTERN.findall(html))
                # Filter out common false positives
                filtered_emails = {
                    e for e in emails
                    if not e.endswith((".png", ".jpg", ".gif", ".svg", ".css", ".js"))
                    and "@" in e
                    and "example.com" not in e
                    and "sentry.io" not in e
                }
                result["emails"] = sorted(filtered_emails)

            if extract_contacts:
                # Extract phone numbers
                phones = set(self.PHONE_PATTERN.findall(html))
                result["phones"] = sorted(phones)[:10]

                # Extract LinkedIn profiles
                linkedin = set(self.LINKEDIN_PATTERN.findall(html))
                result["linkedin_profiles"] = sorted(linkedin)[:20]

                # Extract Twitter profiles
                twitter = set(self.TWITTER_PATTERN.findall(html))
                result["twitter_profiles"] = sorted(twitter)[:10]

            # Content extraction using trafilatura
            if trafilatura:
                content = trafilatura.extract(html)
                if content:
                    result["content_excerpt"] = content[:500]

            # Extract important links (team, about, contact pages)
            for a_tag in soup.find_all("a", href=True):
                href = a_tag.get("href", "")
                text = a_tag.get_text(strip=True).lower()
                if any(kw in text for kw in ["team", "about", "contact", "leadership", "people"]):
                    if href.startswith("/"):
                        parsed = urlparse(url)
                        href = f"{parsed.scheme}://{parsed.netloc}{href}"
                    result["links"].append({"text": text, "url": href})

            result["status"] = "success"

        except httpx.TimeoutException:
            result["status"] = "timeout"
        except Exception as e:
            result["status"] = f"error: {str(e)[:100]}"

        return result

    async def scrape_team_page(self, url: str) -> list[dict]:
        """Scrape a team/about page for individual profiles."""
        people = []
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return people

            soup = BeautifulSoup(response.text, "lxml")

            # Common patterns for team pages
            # Look for cards with name + title
            for card in soup.select(".team-member, .person, .member, .staff, [class*='team'], [class*='person']"):
                name_el = card.select_one("h3, h4, h2, .name, [class*='name']")
                title_el = card.select_one("p, .title, .role, .position, [class*='title'], [class*='role']")
                img_el = card.select_one("img")
                linkedin_el = card.select_one("a[href*='linkedin']")

                if name_el:
                    person = {
                        "name": name_el.get_text(strip=True),
                        "title": title_el.get_text(strip=True) if title_el else "",
                        "image": img_el.get("src", "") if img_el else "",
                        "linkedin": linkedin_el.get("href", "") if linkedin_el else "",
                    }
                    people.append(person)

        except Exception:
            pass

        return people

    async def close(self):
        await self.client.aclose()
