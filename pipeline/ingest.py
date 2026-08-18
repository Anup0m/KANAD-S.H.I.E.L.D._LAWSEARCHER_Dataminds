import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
from google import genai
from pydantic import BaseModel, Field

# Import our custom scraper
from scraper import execute_scraping_job

# Load environment variables
load_dotenv()
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://nbqpbyvtpzozzlnyozjg.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
model = SentenceTransformer('all-MiniLM-L6-v2')

# Initialize Gemini Client
ai_client = None
if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
    ai_client = genai.Client(api_key=GEMINI_API_KEY)

class DocumentMetadata(BaseModel):
    title: str = Field(description="The formal title of the document.")
    category: str = Field(description="One of: 'GR', 'Notification', 'Act', 'Judgment', 'Scheme'")
    date_issued: str = Field(description="Date issued in YYYY-MM-DD format.")
    department_name: str = Field(description="Name of the department (e.g. 'Finance Department').")
    summary: str = Field(description="A concise 100-150 word summary of the document, highlighting key provisions and eligibility.")

def process_and_ingest():
    print("1. Scraping raw documents...")
    scraped_docs = execute_scraping_job()
    
    for raw_doc in scraped_docs:
        raw_text = raw_doc["raw_text"]
        
        metadata = None
        if ai_client:
            print("2. Sending to Gemini for AI Summarization & Extraction...")
            try:
                response = ai_client.models.generate_content(
                    model='gemini-2.0-flash',
                    contents=f"Analyze this official government document and extract the required fields.\n\nDOCUMENT TEXT:\n{raw_text}",
                    config={
                        'response_mime_type': 'application/json',
                        'response_schema': DocumentMetadata,
                    },
                )
                metadata = json.loads(response.text)
                print(f"Extracted Metadata: {metadata}")
            except Exception as e:
                print(f"Gemini API Error: {e}")
                
        if not metadata:
            print("Fallback: Using dummy metadata due to missing API key or error.")
            metadata = {
                "title": "Fallback Title",
                "category": "GR",
                "date_issued": "2026-01-01",
                "department_name": "General Administration",
                "summary": "This is a fallback summary because the Gemini API key was missing."
            }
            
        print("3. Looking up Department ID in Supabase...")
        dept_response = supabase.table("departments").select("id").eq("name", metadata["department_name"]).execute()
        
        if dept_response.data:
            dept_id = dept_response.data[0]["id"]
        else:
            print(f"Department '{metadata['department_name']}' not found. Creating it...")
            new_dept = supabase.table("departments").insert({"name": metadata["department_name"], "jurisdiction": "State"}).execute()
            dept_id = new_dept.data[0]["id"]

        print("4. Generating Vector Embedding...")
        embedding = model.encode(metadata["summary"]).tolist()
        
        print("5. Pushing structured data to Supabase...")
        data = {
            "title": metadata["title"],
            "department_id": dept_id,
            "category": metadata["category"],
            "date_issued": metadata["date_issued"],
            "summary": metadata["summary"],
            "raw_text": raw_text,
            "source_url": raw_doc["source_url"],
            "embedding": embedding
        }
        
        supabase.table("documents").insert(data).execute()
        print("Done! Document successfully ingested.")

if __name__ == "__main__":
    process_and_ingest()
