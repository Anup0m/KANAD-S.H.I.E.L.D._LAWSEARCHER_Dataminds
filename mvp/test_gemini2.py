import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

try:
    for i in range(25):
        response = client.models.generate_content(
            model='gemini-flash-lite-latest',
            contents=f'Hello {i}'
        )
        print(f"Success {i}")
except Exception as e:
    print("Failed:", type(e), repr(e))
