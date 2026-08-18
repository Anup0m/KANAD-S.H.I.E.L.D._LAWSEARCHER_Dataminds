# Kanan - LAWSEARCHER: Deployment Instructions

The Kanan stack is composed of a Vite/React frontend and a FastAPI Python backend, backed by Supabase.

## 1. Prerequisites
- **Node.js** (v18+)
- **Python** (3.10+)
- **Supabase Account** with a provisioned project
- **Google Gemini API Key**

## 2. Environment Variables Setup
Create a .env file in the mvp directory for the backend:
\\\env
SUPABASE_URL="your-supabase-url"
SUPABASE_KEY="your-supabase-anon-key"
GEMINI_API_KEY="your-gemini-api-key"
FRONTEND_URL="https://your-frontend-url.vercel.app"
\\\

Create a .env file in the rontend directory:
\\\env
VITE_API_BASE_URL="https://your-backend-url.onrender.com"
VITE_SUPABASE_URL="your-supabase-url"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
\\\

## 3. Local Development

### Starting the Backend
\\\ash
cd mvp
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
\\\
The backend will run on http://localhost:8000.

### Starting the Frontend
\\\ash
cd frontend
npm install
npm run dev
\\\
The frontend will run on http://localhost:5173.

## 4. Production Deployment

### Frontend (Vercel)
1. Push the repository to GitHub.
2. Log into Vercel and import the repository.
3. Set the Root Directory to rontend.
4. Add the frontend Environment Variables in the Vercel dashboard.
5. Deploy.

### Backend (Render)
1. Log into Render and create a new **Web Service**.
2. Connect the GitHub repository.
3. Set the Root Directory to mvp.
4. Build Command: pip install -r requirements.txt
5. Start Command: uvicorn main:app --host 0.0.0.0 --port 10000
6. Add the backend Environment Variables in the Render dashboard.
7. Deploy.
