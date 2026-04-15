"""
Enrichment Service
Data enrichment using DNS lookup, email validation, WHOIS, tech stack detection,
and other no-API-key tools.
"""

import asyncio
import re
from typing import Optional

import dns.resolver
from email_validator import validate_email as ev_validate, EmailNotValidError
import tldextract
from nameparser import HumanName


class EnrichmentService:
    """
    Enriches lead data with:
    - Email validation (DNS MX + syntax)
    - Domain/company info (WHOIS, TLD)
    - Phone number parsing
    - Name parsing
    - Disposable email detection
    """

    # Common disposable email domains
    DISPOSABLE_DOMAINS = {
        "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
        "yopmail.com", "sharklasers.com", "grr.la", "guerrillamailblock.com",
        "temp-mail.org", "fakeinbox.com", "dispostable.com",
    }

    async def enrich_lead(
        self,
        name: str,
        email: Optional[str] = None,
        company: Optional[str] = None,
        domain: Optional[str] = None,
    ) -> dict:
        """Enrich a lead with all available data."""
        result = {
            "name": name,
            "name_parsed": None,
            "email": email,
            "email_valid": None,
            "email_score": 0.0,
            "company": company,
            "domain": domain,
            "domain_info": None,
            "mx_records": [],
            "is_disposable": False,
        }

        # Parse name
        parsed = HumanName(name)
        result["name_parsed"] = {
            "first": parsed.first,
            "last": parsed.last,
            "middle": parsed.middle,
            "title": parsed.title,
            "suffix": parsed.suffix,
        }

        # Validate email
        if email:
            email_result = await self.validate_email(email)
            result["email_valid"] = email_result["valid"]
            result["email_score"] = email_result["score"]
            result["is_disposable"] = email_result["is_disposable"]
            result["mx_records"] = email_result.get("mx_records", [])

        # Extract domain from email if not provided
        if not domain and email and "@" in email:
            domain = email.split("@")[1]
            result["domain"] = domain

        # Lookup domain info
        if domain:
            domain_info = await self.lookup_company(domain)
            result["domain_info"] = domain_info

        return result

    async def validate_email(self, email: str) -> dict:
        """
        Validate an email address:
        1. RFC syntax check
        2. DNS MX record lookup
        3. Disposable domain check
        """
        result = {
            "email": email,
            "valid": False,
            "score": 0.0,
            "syntax_valid": False,
            "mx_valid": False,
            "is_disposable": False,
            "mx_records": [],
            "reason": "",
        }

        # Step 1: Syntax validation
        try:
            validated = ev_validate(email, check_deliverability=False)
            result["syntax_valid"] = True
            email = validated.normalized
        except EmailNotValidError as e:
            result["reason"] = str(e)
            return result

        # Step 2: Check disposable
        domain = email.split("@")[1].lower()
        if domain in self.DISPOSABLE_DOMAINS:
            result["is_disposable"] = True
            result["reason"] = "Disposable email domain"
            result["score"] = 0.1
            return result

        # Step 3: MX record lookup
        try:
            mx_records = dns.resolver.resolve(domain, "MX")
            result["mx_records"] = [str(r.exchange) for r in mx_records]
            result["mx_valid"] = True
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.resolver.NoNameservers):
            result["reason"] = "No MX records found"
            result["score"] = 0.2
            return result
        except Exception:
            result["reason"] = "DNS lookup failed"
            result["score"] = 0.3
            return result

        # Calculate score
        result["valid"] = True
        score = 0.5  # Base score for valid syntax + MX

        # Bonus for common providers
        common_providers = ["google.com", "outlook.com", "microsoft.com", "yahoo.com"]
        if any(p in str(result["mx_records"]) for p in common_providers):
            score += 0.2

        # Bonus for corporate domains (not free email)
        free_domains = {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"}
        if domain not in free_domains:
            score += 0.15

        result["score"] = min(score, 1.0)
        return result

    async def lookup_company(self, domain: str) -> dict:
        """
        Look up company information from a domain.
        Uses TLD extraction and DNS records.
        """
        result = {
            "domain": domain,
            "registered_domain": None,
            "suffix": None,
            "subdomain": None,
            "has_mx": False,
            "mx_records": [],
            "has_website": False,
        }

        # TLD extraction
        extracted = tldextract.extract(domain)
        result["registered_domain"] = extracted.registered_domain
        result["suffix"] = extracted.suffix
        result["subdomain"] = extracted.subdomain

        # Check MX records
        try:
            mx_records = dns.resolver.resolve(domain, "MX")
            result["mx_records"] = [str(r.exchange) for r in mx_records]
            result["has_mx"] = True
        except Exception:
            pass

        # Check if domain resolves (has A record)
        try:
            dns.resolver.resolve(domain, "A")
            result["has_website"] = True
        except Exception:
            pass

        return result
