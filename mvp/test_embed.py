import os
import traceback
from ai_pipeline import extract_text, embed

try:
    pdf_path = "pdfs/K.A.NA.D Hackathon/judgements/Torrent_Laboratories_Pvt_Ltd_vs_Union_Of_Incia_on_20_October_1989.PDF"
    print("File exists:", os.path.exists(pdf_path))
    text = extract_text(pdf_path)
    print("Text length:", len(text))
    emb = embed(text)
    print("Embedding length:", len(emb))
except Exception as e:
    traceback.print_exc()
