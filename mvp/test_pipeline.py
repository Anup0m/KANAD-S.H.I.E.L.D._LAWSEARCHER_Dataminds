import os
from ai_pipeline import extract_text, process_document

def test():
    pdf_path = "pdfs/dummy.pdf"
    if not os.path.exists(pdf_path):
        print(f"Error: {pdf_path} not found.")
        return
        
    text = extract_text(pdf_path)
    print("--- Extracted Text ---")
    print(text)
    print("----------------------")
    
    print("Testing Gemini Processing...")
    try:
        result = process_document(text)
        print("Success! Gemini returned:")
        print(result)
    except Exception as e:
        print(f"Gemini processing failed: {e}")

if __name__ == "__main__":
    test()
