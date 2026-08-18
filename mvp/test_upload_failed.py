import os
import traceback
from db import upload_pdf_to_storage, supabase

try:
    pdf_path = "pdfs/K.A.NA.D Hackathon/judgements/Torrent_Laboratories_Pvt_Ltd_vs_Union_Of_Incia_on_20_October_1989.PDF"
    print("File exists:", os.path.exists(pdf_path))
    print("File size:", os.path.getsize(pdf_path))
    
    # Try uploading it
    url = upload_pdf_to_storage(pdf_path, os.path.basename(pdf_path))
    print("Upload result URL:", url)
except Exception as e:
    traceback.print_exc()
