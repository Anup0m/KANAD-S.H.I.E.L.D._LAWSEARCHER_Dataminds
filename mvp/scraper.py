import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from db import already_ingested, already_ingested_url

def get_latest_documents_from_india_code(listing_url: str = "https://www.indiacode.nic.in/handle/123456789/2455/browse?type=shorttitle"):
    """
    Crawls a listing page (default: Gujarat State Acts) on India Code.
    Finds detail links, extracts the PDF download URL, and returns a list of new documents to download.
    """
    print(f"Crawling listing page: {listing_url}")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(listing_url, headers=headers, timeout=15)
        response.raise_for_status()
    except Exception as e:
        print(f"Error fetching listing page: {e}")
        return []
        
    soup = BeautifulSoup(response.text, 'html.parser')
    
    detail_links = set()
    for link in soup.find_all('a', href=True):
        href = link['href']
        if '/handle/123456789/' in href and not href.endswith('/browse'):
            absolute_url = urljoin(listing_url, href)
            if absolute_url != listing_url:
                detail_links.add(absolute_url)
                
    print(f"Found {len(detail_links)} detail links. Checking for new documents...")
    
    new_docs = []
    
    for i, detail_url in enumerate(detail_links):
        print(f"[{i+1}/{len(detail_links)}] Inspecting: {detail_url}")
        try:
            res = requests.get(detail_url, headers=headers, timeout=10)
            res.raise_for_status()
            detail_soup = BeautifulSoup(res.text, 'html.parser')
            
            pdf_meta = detail_soup.find('meta', {'name': 'citation_pdf_url'})
            title_meta = detail_soup.find('meta', {'name': 'citation_title'})
            
            if pdf_meta and title_meta:
                pdf_url = pdf_meta['content']
                title = title_meta['content']
                
                if already_ingested_url(pdf_url) or already_ingested(title):
                    print(f"-> Already in database: {title}")
                else:
                    print(f"-> NEW Document found: {title}")
                    new_docs.append({
                        "title": title,
                        "source_url": pdf_url,
                        "detail_url": detail_url
                    })
            else:
                bitstream_link = None
                for a in detail_soup.find_all('a', href=True):
                    if '/bitstream/' in a['href'] and a['href'].endswith('.pdf'):
                        bitstream_link = urljoin(detail_url, a['href'])
                        break
                
                if bitstream_link:
                    h2_title = detail_soup.find('h2')
                    title = h2_title.text.strip() if h2_title else "Untitled Document"
                    
                    if already_ingested_url(bitstream_link) or already_ingested(title):
                        print(f"-> Already in database: {title}")
                    else:
                        print(f"-> NEW Document found: {title}")
                        new_docs.append({
                            "title": title,
                            "source_url": bitstream_link,
                            "detail_url": detail_url
                        })
                        
        except Exception as e:
            print(f"Error inspecting {detail_url}: {e}")
            
    return new_docs

def download_pdf(pdf_url: str, output_folder: str = "pdfs") -> str:
    """Downloads a PDF from a URL and saves it locally."""
    os.makedirs(output_folder, exist_ok=True)
    filename = pdf_url.split('/')[-1]
    if not filename.endswith('.pdf'):
        filename += '.pdf'
        
    local_path = os.path.join(output_folder, filename)
    print(f"Downloading {pdf_url} to {local_path}...")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    response = requests.get(pdf_url, headers=headers, stream=True, timeout=30)
    response.raise_for_status()
    
    with open(local_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
            
    print("Download finished!")
    return local_path

def scrape_html_to_text(url: str) -> str:
    """Scrapes a given HTML URL and extracts its main text content."""
    print(f"Scraping HTML from {url}...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.extract()
            
        text = soup.get_text(separator=' ', strip=True)
        return text
    except Exception as e:
        print(f"Failed to scrape HTML from {url}: {e}")
        return ""


