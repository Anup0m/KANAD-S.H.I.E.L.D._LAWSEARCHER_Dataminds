import os
import traceback
from ai_pipeline import extract_text, process_document

try:
    pdf_path = "pdfs/ahmadcitycourt.pdf"
    text = extract_text(pdf_path)
    print("Text length:", len(text))
    doc_data = process_document(text)
    print("Gemini parsed:", doc_data)
except Exception as e:
    traceback.print_exc()
