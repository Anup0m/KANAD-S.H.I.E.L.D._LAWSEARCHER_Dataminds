import requests
import PyPDF2
import io
import time
import os
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# We'll use a public PDF from a government site (e.g., India's UIDAI/Aadhaar act or a similar public PDF)
# Since URLs change, we use a reliable public PDF URL for testing the pipeline's robustness.
# This URL is the UIDAI Aadhaar Act (2016) public PDF.
TARGET_URL = "https://uidai.gov.in/images/targeted_delivery_of_financial_and_other_subsidies_benefits_and_services_13072016.pdf"

class ScraperError(Exception):
    pass

@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((requests.exceptions.RequestException, ScraperError))
)
def download_pdf(url: str) -> bytes:
    """
    Downloads a PDF with robust exponential backoff.
    """
    print(f"[*] Attempting to download from {url}...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    response = requests.get(url, headers=headers, timeout=15)
    
    if response.status_code != 200:
        print(f"[!] Failed to fetch {url} - Status Code: {response.status_code}")
        raise ScraperError(f"HTTP Error {response.status_code}")
        
    content_type = response.headers.get("Content-Type", "")
    if "pdf" not in content_type.lower():
        print(f"[!] Warning: Content-Type is not PDF ({content_type})")
        
    return response.content

def extract_text_from_pdf_bytes(pdf_bytes: bytes, max_pages: int = 15) -> str:
    """
    Extracts text from a PDF byte stream. Limits to max_pages to avoid 
    blowing up the LLM context window during testing.
    """
    print("[*] Parsing PDF bytes with PyPDF2...")
    pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
    
    total_pages = len(pdf_reader.pages)
    print(f"[*] Detected {total_pages} pages in PDF.")
    
    pages_to_extract = min(total_pages, max_pages)
    
    extracted_text = []
    for i in range(pages_to_extract):
        page = pdf_reader.pages[i]
        text = page.extract_text()
        if text:
            extracted_text.append(text)
            
    final_text = "\n".join(extracted_text)
    print(f"[*] Extraction complete. {len(final_text)} characters extracted.")
    return final_text

def execute_scraping_job():
    """
    Main entry point for the scraping job.
    Returns a list of document dictionaries ready for ingestion.
    """
    try:
        print("\n=== STARTING HEAVY-DUTY SCRAPER JOB ===")
        pdf_bytes = download_pdf(TARGET_URL)
        
        # In a real heavy-duty setup, we might save this to an S3 bucket or local cache
        # so we don't re-download if the LLM extraction fails.
        raw_text = extract_text_from_pdf_bytes(pdf_bytes)
        
        doc = {
            "source_url": TARGET_URL,
            "raw_text": raw_text
        }
        
        print("=== SCRAPER JOB FINISHED SUCCESSFULLY ===\n")
        return [doc]
        
    except Exception as e:
        print(f"[ERROR] Scraper pipeline failed: {e}")
        return []

if __name__ == "__main__":
    docs = execute_scraping_job()
    if docs:
        print("\nPreview of extracted text:")
        print(docs[0]["raw_text"][:500] + "...\n")
