import os
import traceback
from db import upload_pdf_to_storage

try:
    pdf_path = "pdfs/ahmadcitycourt.pdf"
    print("File exists:", os.path.exists(pdf_path))
    print("File size:", os.path.getsize(pdf_path))
    url = upload_pdf_to_storage(pdf_path, os.path.basename(pdf_path))
    print("Result URL:", url)
except Exception as e:
    traceback.print_exc()
