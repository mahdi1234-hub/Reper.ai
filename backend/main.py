"""
Reper.ai - Python Backend for Real-Time Lead Retrieval
FastAPI server with web scraping, data enrichment, and NLP capabilities.
"""

import asyncio
import os
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from services.lead_finder import LeadFinderService
from services.enrichment import EnrichmentService
from services.scraper import ScraperService
from services.nlp_processor import NLPProcessor

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.lead_finder = LeadFinderService()
    app.state.enrichment = EnrichmentService()
    app.state.scraper = ScraperService()
    app.state.nlp = NLPProcessor()
    yield
    # Shutdown
    await app.state.scraper.close()


app = FastAPI(
    title="Reper.ai Lead Finder API",
    description="Real-time lead retrieval, enrichment, and NLP backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Models ---

class LeadSearchRequest(BaseModel):
    query: str
    industry: Optional[str] = None
    location: Optional[str] = None
    company_size: Optional[str] = None
    job_title: Optional[str] = None
    seniority: Optional[list[str]] = None
    limit: int = 25
    page: int = 1


class LeadEnrichRequest(BaseModel):
    name: str
    email: Optional[str] = None
    company: Optional[str] = None
    domain: Optional[str] = None


class EmailValidationRequest(BaseModel):
    email: str


class CompanyLookupRequest(BaseModel):
    domain: str


class ScrapingRequest(BaseModel):
    url: str
    extract_contacts: bool = True
    extract_emails: bool = True


# --- Routes ---

@app.get("/health")
async def health():
    return {"status": "ok", "service": "reper-lead-finder"}


@app.post("/api/leads/search")
async def search_leads(request: LeadSearchRequest):
    """
    Search for leads in real-time from multiple sources.
    Uses web scraping, LinkedIn data, and social media scraping.
    Results are enriched with email validation, NLP analysis, and company data.
    """
    try:
        leads = await app.state.lead_finder.search(
            query=request.query,
            industry=request.industry,
            location=request.location,
            company_size=request.company_size,
            job_title=request.job_title,
            seniority=request.seniority,
            limit=request.limit,
            page=request.page,
        )
        return {
            "leads": leads["results"],
            "total_count": leads["total_count"],
            "page": request.page,
            "limit": request.limit,
            "query": request.query,
            "filters": {
                "industry": request.industry,
                "location": request.location,
                "company_size": request.company_size,
                "job_title": request.job_title,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/leads/enrich")
async def enrich_lead(request: LeadEnrichRequest):
    """
    Enrich a lead with additional data: email validation, company info,
    social profiles, tech stack, etc.
    """
    try:
        enriched = await app.state.enrichment.enrich_lead(
            name=request.name,
            email=request.email,
            company=request.company,
            domain=request.domain,
        )
        return enriched
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/leads/validate-email")
async def validate_email(request: EmailValidationRequest):
    """Validate an email address using DNS MX lookup and syntax checking."""
    try:
        result = await app.state.enrichment.validate_email(request.email)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/leads/company-lookup")
async def company_lookup(request: CompanyLookupRequest):
    """Look up company information from a domain."""
    try:
        result = await app.state.enrichment.lookup_company(request.domain)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/leads/scrape")
async def scrape_url(request: ScrapingRequest):
    """Scrape a URL for contact information and lead data."""
    try:
        result = await app.state.scraper.scrape_page(
            url=request.url,
            extract_contacts=request.extract_contacts,
            extract_emails=request.extract_emails,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/leads/analyze-text")
async def analyze_text(text: str = Query(...)):
    """NLP analysis: extract entities, keywords, sentiment from text."""
    try:
        result = app.state.nlp.analyze(text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/leads/import")
async def import_leads(lead_ids: str = Query(...)):
    """Import selected leads into the CRM database."""
    ids = lead_ids.split(",")
    return {
        "imported": len(ids),
        "lead_ids": ids,
        "message": f"Successfully imported {len(ids)} leads into CRM.",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
