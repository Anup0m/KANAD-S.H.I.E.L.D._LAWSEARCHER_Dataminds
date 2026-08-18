import os
from scraper import get_latest_documents_from_india_code, download_pdf
from ai_pipeline import extract_text, process_document, embed
from db import insert_document, upload_pdf_to_storage, supabase
import traceback

def run_cron_job():
    print("Starting automated document scraper job...")
    
    docs_added = 0
    errors = []
    
    try:
        new_docs = get_latest_documents_from_india_code()
        
        for doc in new_docs:
            print(f"Processing new document: {doc['title']}")
            local_pdf_path = None
            try:
                # 1. Download PDF
                local_pdf_path = download_pdf(doc['source_url'])
                
                # 2. Extract Text
                text = extract_text(local_pdf_path)
                
                # 3. AI Analysis
                doc_data = process_document(text)
                
                # Overwrite title with the scraped title if AI missed it
                if not doc_data.get('title'):
                    doc_data['title'] = doc['title']
                
                # Add source_url
                doc_data['source_url'] = doc['source_url']
                
                # 4. Generate Embedding
                embedding = embed(text)
                
                # 5. Upload PDF to Storage
                pdf_url = upload_pdf_to_storage(local_pdf_path, os.path.basename(local_pdf_path))
                doc_data['pdf_url'] = pdf_url
                
                # 6. Insert to DB
                insert_document(doc_data, text, embedding, pdf_url)
                
                docs_added += 1
                print(f"Successfully processed and ingested: {doc['title']}")
                
            except Exception as e:
                err_msg = f"Failed to process {doc['title']}: {str(e)}"
                print(err_msg)
                traceback.print_exc()
                errors.append(err_msg)
            finally:
                # Always clean up local file, even if it crashed halfway
                if local_pdf_path and os.path.exists(local_pdf_path):
                    os.remove(local_pdf_path)
                
    except Exception as e:
        err_msg = f"Fatal error during scraping: {str(e)}"
        print(err_msg)
        traceback.print_exc()
        errors.append(err_msg)
        
    # Log to scrape_log table
    details = f"Errors: {'; '.join(errors)}" if errors else "Run completed successfully without errors."
    try:
        supabase.table("scrape_log").insert({
            "docs_added": docs_added,
            "details": details
        }).execute()
        print(f"Cron job complete. Logged {docs_added} new documents to scrape_log.")
    except Exception as e:
        print(f"Failed to write to scrape_log: {e}")

if __name__ == "__main__":
    run_cron_job()
