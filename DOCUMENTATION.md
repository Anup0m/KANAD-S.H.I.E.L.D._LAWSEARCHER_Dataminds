# Kanan - LAWSEARCHER: System Documentation

## 1. System Architecture

Kanan is designed as a modern, decoupled web application focused on providing lightning-fast semantic search for legal and government documents. The architecture leverages AI-driven embeddings to understand the context of legal queries, moving beyond simple keyword matching.

### High-Level Components
1. **Frontend (React/Vite)**
   - Built with React, Vite, and modern CSS for a highly responsive, glassmorphism-inspired UI.
   - Communicates with the backend REST APIs.
   - Hosted on Vercel for global edge delivery.

2. **Backend (FastAPI)**
   - High-performance Python backend handling search queries, AI generation, and document metadata extraction.
   - Hosted on Render for scalable API request handling.
   - Integrates with Gemini AI for text generation (e.g., chat, summarization).

3. **Database & Storage (Supabase)**
   - Uses PostgreSQL with the pgvector extension for storing high-dimensional document embeddings.
   - Provides scalable Object Storage for raw PDF files.
   - Manages Row Level Security (RLS) for data integrity.

4. **AI Pipeline**
   - **Embedding Model**: Text-embedding models convert document chunks into vector arrays.
   - **Generation Model**: Google Gemini handles complex legal Q&A and generates document summaries.
   - **Ingestion**: A custom Python pipeline that extracts text from PDFs using PyMuPDF, chunks it, embeds it, and stores it into Supabase.

---

## 2. Core Modules

### A. Semantic Search Module
- **Endpoint**: /search
- **Functionality**: Takes a user query, generates a vector embedding for the query, and performs a cosine similarity search against the Supabase pgvector database to find the most contextually relevant document chunks.
- **Filtering**: Supports dynamic SQL filtering by Document Type (Act, GR, Notification), Region, Department, and Date ranges.

### B. Legal AI Chatbot Module
- **Endpoint**: /chat
- **Functionality**: Acts as an interactive legal assistant. It uses Retrieval-Augmented Generation (RAG) by fetching relevant document chunks based on the user's prompt and feeding them as context into the Gemini AI model to generate accurate, citation-backed answers.

### C. Document Ingestion Pipeline
- **Script**: scraper.py / i_pipeline.py
- **Functionality**: Automates the retrieval of documents from sources like the India Code portal. It downloads the PDF, extracts text, generates an English summary via AI, creates embeddings, and uploads the final structured data and PDF to Supabase.

### D. Dynamic Social Sharing Module
- **Endpoint**: /share/{doc_id}
- **Functionality**: Dynamically renders the first page of a requested PDF using PyMuPDF to create a visual thumbnail (og:image) for WhatsApp and Twitter previews, before redirecting the user to the frontend document page.

---

## 3. Usage Guide

### Searching for Documents
1. Navigate to the main Search page.
2. Enter a query in natural language, e.g., *"What are the new rules for land acquisition?"*
3. Use the **Filters sidebar** to narrow down results by Document Type (e.g., Act or GR) or Jurisdiction (e.g., Gujarat).
4. Results are scored by AI Match percentage.

### Chatting with the Legal Assistant
1. Navigate to the **AI Chat** page.
2. Type your legal question. The AI will cross-reference the indexed live documents to provide an answer.
3. The AI will cite its sources below the answer, allowing you to click directly through to the relevant government resolution or act.

### Viewing and Sharing
1. Click on any document card to view its metadata, full AI summary, and extracted keywords.
2. Use the **View Original PDF** button to read the source document.
3. Use the **Share** button to copy the link. Pasting it into a messaging app will automatically display an image preview of the document's first page.
