import os
import json
import fitz  # PyMuPDF
from google import genai
from google.genai import types
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential

load_dotenv()

# Configure new Gemini Client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

GENERATION_MODEL = "gemini-flash-lite-latest"
EMBEDDING_MODEL = "gemini-embedding-2"

@retry(stop=stop_after_attempt(6), wait=wait_exponential(multiplier=2, min=5, max=60))
def _ocr_images_with_gemini(images: list) -> str:
    """Uses Gemini Vision to OCR a list of page images. Retries automatically on 503/429 errors."""
    prompt = "Transcribe all text from these document pages verbatim. Output only the transcription."
    contents = [prompt] + images
    response = client.models.generate_content(
        model=GENERATION_MODEL,
        contents=contents
    )
    transcribed_text = response.text.strip()
    print(f"Successfully transcribed scanned PDF using Gemini! Extracted {len(transcribed_text)} characters.")
    return transcribed_text

def extract_text(pdf_path: str) -> str:
    """Extract text from a PDF file using PyMuPDF. Fallback to Gemini Vision OCR if scanned.
    Scanned PDFs are NEVER skipped — OCR retries up to 6 times on server errors."""
    print(f"Extracting text from {pdf_path}...")
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text() + "\n"
    
    cleaned_text = text.strip()
    if len(cleaned_text) < 50:
        print("No extractable text found. Rendering pages as images for Gemini OCR...")
        images = []
        for i, page in enumerate(doc):
            if i >= 10:  # limit to first 10 pages for safety
                break
            pix = page.get_pixmap(dpi=150)
            png_bytes = pix.tobytes("png")
            images.append(
                types.Part.from_bytes(
                    data=png_bytes,
                    mime_type="image/png"
                )
            )
        
        if images:
            # This raises if all retries fail — the caller in main.py will catch and log it
            return _ocr_images_with_gemini(images)
                
    return cleaned_text

@retry(stop=stop_after_attempt(6), wait=wait_exponential(multiplier=2, min=4, max=30))
def process_document(text: str) -> dict:
    """
    Sends the document text to Gemini and returns a structured JSON object with:
    - title, summary_en, region, doc_type, publish_year, department, keywords, referenced_acts
    """
    prompt = f"""
    Analyze this Indian legal document and extract the following fields as a JSON object:
    - "title": The official title of the document (e.g. 'The Gujarat Tenancy Act, 1948'). 
    - "summary_en": A clear, plain-English paragraph summarizing what this document is about and what it does.
    - "region": Either 'gujarat', 'central', or 'unknown' based on whether this is a Gujarat state document or a Central government document.
    - "doc_type": One of 'act', 'gr', 'notification', 'judgment', 'scheme', or 'other'.
    - "publish_year": An integer representing the year this document was issued/published (e.g. 2026, 1991, 2017). If the year is not mentioned and cannot be determined, set to null.
    - "department": The name of the government department or ministry that issued this document (e.g. 'Revenue Department', 'Education Department', 'Home Department', 'Finance Department', 'Health Department'). If unknown, set to null.
    - "keywords": A list of 5-8 short keyword strings that best describe the topics covered in this document (e.g. ["land acquisition", "compensation", "revenue"]). Always return as a JSON array.
    - "referenced_acts": A list of strings containing the names of any other Acts, Rules, or major legal documents explicitly referenced or cited within this text. If none are found, return an empty array [].
    Document Text:
    {text[:15000]} 
    
    Return the output as a clean JSON object with no markdown wrappers.
    """
    
    response = client.models.generate_content(
        model=GENERATION_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            system_instruction="You are a legal document analyzer. Extract information from the text and return ONLY a valid JSON object."
        )
    )
    
    try:
        return json.loads(response.text)
    except Exception as e:
        print(f"Error parsing Gemini response: {response.text}")
        raise e

@retry(stop=stop_after_attempt(6), wait=wait_exponential(multiplier=2, min=4, max=30))
def embed(text: str) -> list[float]:
    """Generates a 768-dimensional embedding using Gemini."""
    print("Generating embedding...")
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=768
        )
    )
    return result.embeddings[0].values
