import traceback
from db import supabase

print("Wiping Supabase Storage 'pdfs' bucket...")
try:
    files = supabase.storage.from_("pdfs").list()
    print("Files found in bucket:", len(files))
    if files:
        file_names = [f["name"] for f in files]
        print("Deleting files:", file_names)
        res = supabase.storage.from_("pdfs").remove(file_names)
        print("Delete response:", res)
    else:
        print("Bucket is already empty!")
except Exception as e:
    traceback.print_exc()
