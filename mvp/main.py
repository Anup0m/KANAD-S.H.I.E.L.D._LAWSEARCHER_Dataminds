import os
import glob
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from ai_pipeline import extract_text, process_document, embed, client, GENERATION_MODEL
from db import already_ingested_url, insert_document, search_by_embedding, supabase, get_stats, upload_pdf_to_storage

app = FastAPI(title="Kanan - Legal Document Intelligence", version="1.0.0")

# Allow frontend to connect from any origin (for hackathon demo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from scraper import get_latest_documents_from_india_code, download_pdf

# ---------------------------------------------------------
# BATCH INGESTION LOGIC
# ---------------------------------------------------------
def ingest_all_pdfs(folder_path="pdfs", check_online: bool = False):
    tasks = []
    
    if check_online:
        print("Checking for updates on the government portal...")
        new_docs = get_latest_documents_from_india_code()
        if new_docs:
            print(f"Found {len(new_docs)} new documents on the government portal.")
            for doc in new_docs:
                try:
                    local_path = download_pdf(doc["source_url"], folder_path)
                    tasks.append({
                        "path": local_path,
                        "source_url": doc["source_url"],
                        "filename": os.path.basename(local_path)
                    })
                except Exception as e:
                    print(f"Failed to download {doc['title']}: {e}")
                    
    print("Checking local folder for manual PDFs...")
    pdf_files = glob.glob(os.path.join(folder_path, "**", "*.pdf"), recursive=True)
    for pdf in pdf_files:
        filename = os.path.basename(pdf)
        # Skip the dummy PDF
        if filename == "dummy.pdf":
            continue
        # Only ingest if not already in the DB
        source_url = f"local://{filename}"
        if not already_ingested_url(source_url):
            tasks.append({
                "path": pdf,
                "source_url": source_url,
                "filename": filename
            })

    if not tasks:
        print("Everything is fully up to date. No ingestion needed.")
        return

    for task in tasks:
        pdf_path = task["path"]
        filename = task["filename"]
        source_url = task["source_url"]
        
        print(f"\nProcessing {filename}...")
        try:
            # 1. Extract text
            text = extract_text(pdf_path)
            if not text.strip():
                print(f"Skipping {filename}: No extractable text found (scanned PDF).")
                continue
                
            # Run Gemini extraction on text
            doc_data = process_document(text)
            
            # Use filename as backup title if Gemini failed to extract it
            if not doc_data.get("title"):
                doc_data["title"] = filename
                
            # Add source_url to the document metadata
            doc_data["source_url"] = source_url
                
            # 2. Upload PDF to Supabase Storage
            pdf_url = upload_pdf_to_storage(pdf_path, filename)
                
            # 3. Get embeddings from Gemini
            embedding = embed(text)
            
            # 4. Save to Supabase
            insert_document(doc_data, text, embedding, pdf_url=pdf_url)
            print(f"Successfully inserted and indexed {filename}!")
            
        except Exception as e:
            print(f"Failed to process {filename}: {e}")
        finally:
            import time
            time.sleep(3)

# ---------------------------------------------------------
# FASTAPI ENDPOINTS
# ---------------------------------------------------------

@app.get("/")
def root():
    """Health check."""
    return {"status": "ok", "app": "Kanan - Legal Document Intelligence"}

@app.get("/search")
def search(
    q: str = Query(..., description="The search query"),
    region: Optional[str] = Query(None, description="Filter by region: central, gujarat, unknown"),
    doc_type: Optional[str] = Query(None, description="Filter by type: act, gr, notification, other"),
    department: Optional[str] = Query(None, description="Filter by department name"),
    year_from: Optional[int] = Query(None, description="Filter from year"),
    year_to: Optional[int] = Query(None, description="Filter to year"),
    limit: int = Query(10, description="Max results to return")
):
    """Searches for documents by semantic meaning, with optional filters."""
    try:
        query_embedding = embed(q)
        results = search_by_embedding(query_embedding, limit=limit,
                                      region=region, doc_type=doc_type,
                                      department=department)
        # Apply year filter client-side (fast, avoids SQL changes)
        if year_from:
            results = [r for r in results if r.get('publish_year') and r['publish_year'] >= year_from]
        if year_to:
            results = [r for r in results if r.get('publish_year') and r['publish_year'] <= year_to]
            
        # Log the search asynchronously (fire and forget via supabase)
        try:
            supabase.table("search_log").insert({
                "query_text": q.lower().strip(),
                "region_filter": region,
                "doc_type_filter": doc_type,
                "result_count": len(results)
            }).execute()
        except Exception as log_e:
            print(f"Failed to log search: {log_e}")
            
        return {"query": q, "filters": {"region": region, "doc_type": doc_type, "department": department}, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/trending")
def get_trending_searches():
    """Returns the top 10 most searched queries."""
    try:
        try:
            response = supabase.table("search_log").select("query_text").order("searched_at", desc=True).limit(500).execute()
        except Exception as db_e:
            print(f"Skipping trending: {db_e}")
            return []
            
        counts = {}
        for row in response.data:
            q = row['query_text']
            if len(q) > 2: # Ignore very short queries
                counts[q] = counts.get(q, 0) + 1
                
        # Sort by frequency
        sorted_trends = sorted(counts.items(), key=lambda item: item[1], reverse=True)[:10]
        return [{"query": q, "count": c} for q, c in sorted_trends]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/doc/{doc_id}")
def get_document(doc_id: str):
    """Fetches full details of a specific document."""
    try:
        response = supabase.table("documents").select("*").eq("id", doc_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Document not found")
        doc = response.data[0]
        
        referenced_ids = doc.get("referenced_act_ids") or []
        doc["related_documents"] = []
        if referenced_ids:
            try:
                related_resp = supabase.table("documents").select("id, title, doc_type, publish_year").in_("id", referenced_ids).execute()
                if related_resp.data:
                    doc["related_documents"] = related_resp.data
            except Exception as e:
                print(f"Error fetching related docs: {e}")
                
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
def get_dashboard_stats():
    """Returns analytics stats for the dashboard."""
    try:
        return get_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/whats-new")
def get_whats_new():
    """Returns the most recently added documents from the database (e.g. from the last 7 days)."""
    try:
        # Get the top 10 most recent documents based on created_at
        response = supabase.table("documents").select("id, title, doc_type, region, created_at").order("created_at", desc=True).limit(10).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chat")
def chat(q: str = Query(..., description="Ask a legal question")):
    """
    RAG endpoint: retrieves top matching documents, sends them as context
    to Gemini, and returns a cited answer.
    """
    try:
        # 1. Embed the question
        query_embedding = embed(q)
        
        # 2. Retrieve top 3 matching documents
        docs = search_by_embedding(query_embedding, limit=3)
        
        if not docs:
            return {"question": q, "answer": "No relevant documents found in the database.", "sources": []}
        
        # 3. Build context from retrieved documents
        context = ""
        sources = []
        for i, doc in enumerate(docs):
            context += f"\n--- Document {i+1}: {doc['title']} ---\n"
            context += f"Summary: {doc['summary_en']}\n"
            content_preview = (doc.get('content') or '')[:3000]
            context += f"Content: {content_preview}\n"
            sources.append({"id": doc["id"], "title": doc["title"], "similarity": doc["similarity"]})
        
        # 4. Ask Gemini for a cited answer
        prompt = f"""You are a helpful legal assistant for Indian law. 
Answer the user's question using ONLY the documents provided below. 
If the documents don't contain enough information, say so honestly.
Always cite which document(s) you used by their title.

DOCUMENTS:
{context}

USER QUESTION: {q}

Provide a clear, concise answer citing the document titles."""

        from google.genai import types
        response = client.models.generate_content(
            model=GENERATION_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="You are a legal research assistant specializing in Indian law."
            )
        )
        
        answer_text = "I'm sorry, I couldn't generate an answer for that. Please try rephrasing your question."
        if hasattr(response, 'text') and response.text:
            answer_text = response.text
            
        return {
            "question": q,
            "answer": answer_text,
            "sources": sources
        }
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/share/{doc_id}", response_class=HTMLResponse)
def share_document(doc_id: str):
    """
    Returns an HTML page with Open Graph metadata for rich social sharing (WhatsApp/Twitter),
    then immediately redirects to the frontend document page.
    """
    try:
        response = supabase.table("documents").select("title, summary_en, doc_type").eq("id", doc_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Document not found")
            
        doc = response.data[0]
        title = doc.get('title') or "Legal Document"
        
        desc = doc.get('summary_en') or ""
        if len(desc) > 150:
            desc = desc[:147] + "..."
        elif not desc:
            desc = f"View this {doc.get('doc_type', 'document')} on Kanan - Legal Document Intelligence."
            
        og_image = "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=1200&auto=format&fit=crop"
        frontend_url = f"http://localhost:5173/document/{doc_id}"

        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{title} | Kanan</title>
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{desc}">
    <meta property="og:image" content="{og_image}">
    <meta property="og:type" content="article">
    
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{desc}">
    <meta name="twitter:image" content="{og_image}">
    
    <script>
        window.location.href = "{frontend_url}";
    </script>
</head>
<body>
    <p>Redirecting to document...</p>
    <a href="{frontend_url}">Click here if not redirected.</a>
</body>
</html>"""
        return HTMLResponse(content=html_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "ingest":
        check_online = len(sys.argv) > 2 and sys.argv[2] == "online"
        ingest_all_pdfs(check_online=check_online)
    else:
        import uvicorn
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
