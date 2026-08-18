import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    response = requests.get(url)
    if response.status_code == 200:
        for model in response.json().get('models', []):
            if 'generateContent' in model.get('supportedGenerationMethods', []):
                print(model['name'])
    else:
        print("Error:", response.text)
