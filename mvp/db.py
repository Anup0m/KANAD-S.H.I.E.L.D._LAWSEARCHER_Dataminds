import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY") # Use Service Role key for ingestion if possible

if not url or not key:
    print("WARNING: Supabase URL or Key is missing from .env!")

supabase: Client = create_client(url, key)

def already_ingested(title: str) -> bool:
    """Check if a document with this title already exists."""
    response = supabase.table("documents").select("id").eq("title", title).execute()
    return len(response.data) > 0

def already_ingested_url(source_url: str) -> bool:
    """Check if a document with this source URL already exists."""
    response = supabase.table("documents").select("id").eq("source_url", source_url).execute()
    return len(response.data) > 0

def insert_document(doc_data: dict, content: str, embedding: list[float], pdf_url: str = None):
    """Inserts the document and its embedding into Supabase."""
    print(f"Inserting '{doc_data.get('title')}' into Supabase...")
    
    referenced_acts = doc_data.get("referenced_acts") or []
    referenced_act_ids = []
    
    if referenced_acts:
        print(f"Resolving referenced acts: {referenced_acts}")
        for act in referenced_acts:
            if not isinstance(act, str) or len(act) < 4:
                continue
            # Try to find a document with a similar title
            try:
                resp = supabase.table("documents").select("id").ilike("title", f"%{act}%").limit(1).execute()
                if resp.data:
                    referenced_act_ids.append(resp.data[0]["id"])
            except Exception as e:
                print(f"Error resolving act '{act}': {e}")
                
    # Remove duplicates
    referenced_act_ids = list(set(referenced_act_ids))

    payload = {
        "title": doc_data.get("title"),
        "summary_en": doc_data.get("summary_en"),
        "region": doc_data.get("region"),
        "doc_type": doc_data.get("doc_type"),
        "source_url": doc_data.get("source_url"),
        "pdf_url": pdf_url or doc_data.get("pdf_url"),
        "publish_year": doc_data.get("publish_year"),
        "department": doc_data.get("department"),
        "keywords": doc_data.get("keywords") or [],
        "referenced_acts": referenced_acts,
        "referenced_act_ids": referenced_act_ids,
        "content": content,
        "embedding": embedding
    }
    
    response = supabase.table("documents").insert(payload).execute()
    return response

def upload_pdf_to_storage(local_path: str, file_name: str) -> str:
    """Uploads a PDF file to Supabase Storage bucket 'pdfs' and returns its public URL."""
    print(f"Uploading {file_name} to Supabase Storage...")
    try:
        # Replace spaces in filename to prevent URL issues
        safe_filename = file_name.replace(" ", "_")
        with open(local_path, 'rb') as f:
            # Upload the file using standard storage upload
            supabase.storage.from_("pdfs").upload(
                path=safe_filename,
                file=f,
                file_options={"content-type": "application/pdf", "x-upsert": "true"}
            )
            
        public_url = supabase.storage.from_("pdfs").get_public_url(safe_filename)
        print(f"Uploaded successfully! Public URL: {public_url}")
        return public_url
    except Exception as e:
        print(f"Failed to upload PDF to storage: {e}")
        return None

def search_by_embedding(query_embedding: list[float], limit: int = 5,
                        region: str = None, doc_type: str = None, department: str = None):
    """Calls the Postgres function to perform vector similarity search."""
    params = {
        "query_embedding": query_embedding,
        "match_threshold": 0.5,
        "match_count": limit
    }
    if region:
        params["filter_region"] = region
    if doc_type:
        params["filter_doc_type"] = doc_type
    if department:
        params["filter_department"] = department
        
    response = supabase.rpc("match_documents", params).execute()
    return response.data

def get_stats():
    """Returns total document count, counts grouped by doc_type and region."""
    total = supabase.table("documents").select("id", count="exact").execute()
    rows = supabase.table("documents").select("doc_type", "region").execute()
    
    type_counts = {}
    region_counts = {}
    for row in rows.data:
        t = row.get("doc_type") or "other"
        type_counts[t] = type_counts.get(t, 0) + 1
        r = row.get("region") or "unknown"
        region_counts[r] = region_counts.get(r, 0) + 1
    
    return {
        "total": total.count,
        "by_type": type_counts,
        "by_region": region_counts
    }
