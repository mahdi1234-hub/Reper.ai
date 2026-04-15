"""
NLP Processor Service
Text analysis using VADER sentiment, keyword extraction, language detection,
entity extraction, and fuzzy matching for deduplication.
"""

import re
from typing import Optional

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from langdetect import detect as detect_language
from rapidfuzz import fuzz, process
from unidecode import unidecode

try:
    from keybert import KeyBERT
    kw_model = KeyBERT()
except ImportError:
    kw_model = None


class NLPProcessor:
    """
    NLP processing service for:
    - Sentiment analysis (VADER)
    - Keyword extraction (KeyBERT)
    - Language detection
    - Named entity extraction (regex-based)
    - Fuzzy name deduplication (rapidfuzz)
    """

    def __init__(self):
        self.sentiment_analyzer = SentimentIntensityAnalyzer()

        # Common name patterns for entity extraction
        self.name_pattern = re.compile(
            r"\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b"
        )
        self.email_pattern = re.compile(
            r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
        )
        self.company_indicators = [
            "Inc", "Corp", "LLC", "Ltd", "GmbH", "Co", "Company",
            "Group", "Holdings", "Technologies", "Solutions", "Labs",
            "Ventures", "Partners", "Associates", "Consulting",
        ]

    def analyze(self, text: str) -> dict:
        """Full NLP analysis of a text."""
        return {
            "sentiment": self.analyze_sentiment(text),
            "keywords": self.extract_keywords(text),
            "language": self.detect_language(text),
            "entities": self.extract_entities(text),
            "summary_stats": {
                "word_count": len(text.split()),
                "char_count": len(text),
                "sentence_count": len(re.split(r"[.!?]+", text)),
            },
        }

    def analyze_sentiment(self, text: str) -> dict:
        """Analyze sentiment using VADER."""
        scores = self.sentiment_analyzer.polarity_scores(text)
        # Determine overall sentiment
        compound = scores["compound"]
        if compound >= 0.05:
            label = "positive"
        elif compound <= -0.05:
            label = "negative"
        else:
            label = "neutral"

        return {
            "label": label,
            "compound": compound,
            "positive": scores["pos"],
            "negative": scores["neg"],
            "neutral": scores["neu"],
        }

    def extract_keywords(self, text: str, top_n: int = 10) -> list[dict]:
        """Extract keywords using KeyBERT or fallback to TF-based extraction."""
        if kw_model and len(text) > 50:
            try:
                keywords = kw_model.extract_keywords(
                    text,
                    keyphrase_ngram_range=(1, 2),
                    stop_words="english",
                    top_n=top_n,
                )
                return [{"keyword": kw, "score": round(score, 3)} for kw, score in keywords]
            except Exception:
                pass

        # Fallback: simple word frequency
        words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
        stop_words = {"the", "and", "for", "are", "but", "not", "you", "all", "can", "her",
                      "was", "one", "our", "out", "has", "its", "his", "how", "who", "will",
                      "with", "from", "this", "that", "they", "been", "have", "many", "some",
                      "them", "than", "each", "which", "their", "said", "more", "about"}
        filtered = [w for w in words if w not in stop_words]

        freq = {}
        for w in filtered:
            freq[w] = freq.get(w, 0) + 1

        sorted_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)
        return [{"keyword": w, "score": round(c / len(filtered), 3)} for w, c in sorted_words[:top_n]]

    def detect_language(self, text: str) -> dict:
        """Detect the language of text."""
        try:
            lang = detect_language(text)
            lang_names = {
                "en": "English", "fr": "French", "de": "German", "es": "Spanish",
                "it": "Italian", "pt": "Portuguese", "nl": "Dutch", "ja": "Japanese",
                "zh-cn": "Chinese", "ko": "Korean", "ar": "Arabic", "hi": "Hindi",
                "ru": "Russian", "tr": "Turkish", "pl": "Polish", "sv": "Swedish",
            }
            return {
                "code": lang,
                "name": lang_names.get(lang, lang),
                "confidence": 0.9,  # langdetect doesn't expose confidence easily
            }
        except Exception:
            return {"code": "unknown", "name": "Unknown", "confidence": 0.0}

    def extract_entities(self, text: str) -> dict:
        """Extract named entities using regex patterns."""
        entities = {
            "persons": [],
            "emails": [],
            "companies": [],
            "locations": [],
        }

        # Extract potential person names (Title Case sequences)
        names = self.name_pattern.findall(text)
        # Filter out common false positives
        false_positives = {"The", "This", "That", "With", "From", "About", "After", "Before"}
        entities["persons"] = [
            n for n in set(names)
            if n.split()[0] not in false_positives and len(n) > 4
        ][:20]

        # Extract emails
        entities["emails"] = list(set(self.email_pattern.findall(text)))[:20]

        # Extract companies (words near company indicators)
        for indicator in self.company_indicators:
            pattern = rf"\b(\w+(?:\s\w+){{0,3}})\s+{indicator}\b"
            matches = re.findall(pattern, text)
            entities["companies"].extend(matches)
        entities["companies"] = list(set(entities["companies"]))[:20]

        # Extract locations (common city/country names)
        location_pattern = re.compile(
            r"\b(San Francisco|New York|London|Berlin|Mumbai|Singapore|Tokyo|Sydney|"
            r"Austin|Seattle|Boston|Chicago|Los Angeles|Paris|Amsterdam|Dublin|"
            r"Toronto|Vancouver|Melbourne|Shanghai|Beijing|Seoul|Bangalore|"
            r"United States|United Kingdom|Germany|France|India|Japan|"
            r"Canada|Australia|Singapore|Netherlands|Ireland)\b",
            re.IGNORECASE,
        )
        entities["locations"] = list(set(location_pattern.findall(text)))[:20]

        return entities

    def deduplicate_names(self, names: list[str], threshold: int = 85) -> list[list[str]]:
        """
        Group duplicate/similar names using fuzzy matching.
        Returns groups of similar names.
        """
        if not names:
            return []

        # Normalize names for comparison
        normalized = [unidecode(n).lower().strip() for n in names]

        groups = []
        used = set()

        for i, name in enumerate(normalized):
            if i in used:
                continue

            group = [names[i]]
            used.add(i)

            for j in range(i + 1, len(normalized)):
                if j in used:
                    continue
                score = fuzz.ratio(name, normalized[j])
                if score >= threshold:
                    group.append(names[j])
                    used.add(j)

            groups.append(group)

        return groups

    def score_lead_relevance(self, lead_text: str, query: str) -> float:
        """Score how relevant a lead is to the search query."""
        if not lead_text or not query:
            return 0.0

        # Fuzzy match score
        fuzzy_score = fuzz.partial_ratio(query.lower(), lead_text.lower()) / 100

        # Keyword overlap
        query_words = set(query.lower().split())
        lead_words = set(lead_text.lower().split())
        if query_words:
            overlap = len(query_words & lead_words) / len(query_words)
        else:
            overlap = 0

        # Combined score
        return round(fuzzy_score * 0.7 + overlap * 0.3, 3)
