"""
Re-classifies ALL documents using smart regex first, then Gemini for ambiguous ones.
7 categories: act, gr, notification, judgment, circular, rules, other
"""
import os
import re
import time
from collections import Counter
from google import genai
from dotenv import load_dotenv
from db import supabase

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

VALID_TYPES = {"act", "gr", "notification", "judgment", "circular", "rules", "other"}

def regex_classify(title: str, content: str) -> str | None:
    """Fast regex-based classification. Returns None if ambiguous."""
    t = title.lower()
    c = (content or "")[:500].lower()
    
    # Court judgment patterns
    if re.search(r'\b(vs\.?|versus)\b', t):
        return "judgment"
    if any(x in t for x in ["high court", "supreme court", "tribunal order", "judgement", "judgment"]):
        return "judgment"
    
    # Rules patterns
    if re.search(r'\brules?,\s*\d{4}\b', t) or t.endswith("rules") or "rules, 19" in t or "rules, 20" in t:
        return "rules"
    
    # Act patterns  
    if re.search(r'\bact,\s*\d{4}\b', t) or t.endswith("act"):
        return "act"
    
    # GR patterns
    if any(x in t for x in ["government resolution", "gr no", "g.r.", "resolution no"]):
        return "gr"
    if "resolution" in c and "government" in c:
        return "gr"
    
    # Notification patterns
    if any(x in t for x in ["gazette notification", "gazette extraordinary", "g.g.", "notification no"]):
        return "notification"
    
    # Circular patterns
    if "circular" in t or "circular no" in c:
        return "circular"
    
    return None  # Ambiguous — needs Gemini

def gemini_classify(title: str, content: str) -> str:
    """Use Gemini for ambiguous cases."""
    prompt = f"""Classify this legal document into exactly ONE of these categories:
- act        → Acts and laws passed by a legislature
- gr         → Government Resolutions (GR) issued by a department
- notification → Official gazette notifications
- judgment   → Court judgments, orders, or rulings
- circular   → Government circulars and directives
- rules      → Statutory rules and regulations
- other      → Anything that doesn't fit

Title: {title}
Content excerpt: {content[:2000]}

Output ONLY the single category word. Nothing else."""

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt
    )
    result = response.text.strip().lower().strip("'\"")
    return result if result in VALID_TYPES else "other"

# Fetch all documents
print("Fetching all 110 documents...")
res = supabase.table("documents").select("id", "title", "content", "doc_type").execute()
docs = res.data
print(f"Retrieved {len(docs)} documents.\n")

regex_updates = 0
gemini_updates = 0
gemini_calls = 0
RATE_LIMIT_DELAY = 5  # seconds between Gemini calls to stay under 15 RPM

for doc in docs:
    doc_id = doc["id"]
    title = doc.get("title") or ""
    content = doc.get("content") or ""
    current_type = doc.get("doc_type") or "other"

    # Try regex first
    new_type = regex_classify(title, content)

    if new_type is None:
        # Fall back to Gemini for ambiguous ones
        try:
            if gemini_calls > 0 and gemini_calls % 14 == 0:
                print(f"  [Rate limit pause 60s after {gemini_calls} Gemini calls...]")
                time.sleep(60)
            new_type = gemini_classify(title, content)
            gemini_calls += 1
            time.sleep(RATE_LIMIT_DELAY)
        except Exception as e:
            print(f"  Gemini failed for '{title[:40]}': {e}")
            new_type = current_type  # keep existing type on failure

    if new_type != current_type:
        supabase.table("documents").update({"doc_type": new_type}).eq("id", doc_id).execute()
        print(f"  Updated: '{title[:50]}' {current_type} -> {new_type}")
        if gemini_calls > 0:
            gemini_updates += 1
        else:
            regex_updates += 1

print(f"\nDone!")
print(f"  Regex-classified updates: {regex_updates}")
print(f"  Gemini-classified updates: {gemini_updates}")
print(f"  Gemini API calls made: {gemini_calls}")
print(f"\nFinal category breakdown:")
all_docs = supabase.table("documents").select("doc_type").execute().data
counts = Counter(d["doc_type"] for d in all_docs)
for k, v in sorted(counts.items()):
    print(f"  {k}: {v}")
