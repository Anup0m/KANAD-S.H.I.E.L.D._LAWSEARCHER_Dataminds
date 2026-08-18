// Central API client — all calls go through our FastAPI backend
export const BASE_URL = import.meta.env.VITE_API_URL || 'https://kanan-backend-8ppm.onrender.com';

export async function searchDocs({ q, doc_type, region, department, year_from, year_to, limit = 10 }) {
  const params = new URLSearchParams({ q, limit });
  if (doc_type) params.set('doc_type', doc_type);
  if (region) params.set('region', region);
  if (department) params.set('department', department);
  if (year_from) params.set('year_from', year_from);
  if (year_to) params.set('year_to', year_to);
  const res = await fetch(`${BASE_URL}/search?${params}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function getDoc(id) {
  const res = await fetch(`${BASE_URL}/doc/${id}`);
  if (!res.ok) throw new Error('Document not found');
  return res.json();
}

export async function getStats() {
  const res = await fetch(`${BASE_URL}/stats`);
  if (!res.ok) throw new Error('Stats failed');
  return res.json();
}

export async function chatQuery(q) {
  const res = await fetch(`${BASE_URL}/chat?${new URLSearchParams({ q })}`);
  if (!res.ok) throw new Error('Chat failed');
  return res.json();
}
export async function getWhatsNew() {
  const res = await fetch(`${BASE_URL}/whats-new`);
  if (!res.ok) throw new Error('Whats New failed');
  return res.json();
}

export async function getTrending() {
  const res = await fetch(`${BASE_URL}/trending`);
  if (!res.ok) throw new Error('Trending failed');
  return res.json();
}
