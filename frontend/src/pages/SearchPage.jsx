import React, { useState, useRef } from 'react';
import { Search as SearchIcon, Filter, FileText, ExternalLink, Clock, ChevronDown, X, Sparkles, Scale, BookOpen, Gavel } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchDocs } from '../lib/api';

const DOC_TYPES = ['act', 'gr', 'notification', 'judgment', 'circular', 'rules', 'scheme', 'other'];
const REGIONS = ['gujarat', 'central'];
const DEPARTMENTS = ['Revenue Department', 'Education Department', 'Home Department', 'Finance Department', 'Health Department', 'General Administration Department'];

const SUGGESTIONS = [
  'land acquisition rules', 'pension policy Gujarat', 'stamp duty amendment',
  'medical establishments act', 'education act 2013', 'revenue jurisdiction',
  'court judgment income tax', 'government resolution 2024',
];

const TYPE_ICONS = {
  act: <Scale size={11} />,
  gr: <FileText size={11} />,
  notification: <Clock size={11} />,
  judgment: <Gavel size={11} />,
  circular: <BookOpen size={11} />,
  rules: <FileText size={11} />,
  scheme: <Sparkles size={11} />,
  other: <FileText size={11} />,
};

function DocBadge({ type }) {
  return (
    <span className={`badge badge-${type}`}>
      {TYPE_ICONS[type] || null}
      {type?.toUpperCase()}
    </span>
  );
}

function RegionBadge({ region }) {
  if (!region || region === 'unknown') return null;
  return <span className={`badge badge-${region}`}>{region === 'gujarat' ? '🏛 Gujarat' : '🇮🇳 Central'}</span>;
}

function SkeletonCard() {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div className="skeleton" style={{ height: 22, width: 60 }} />
        <div className="skeleton" style={{ height: 22, width: 80 }} />
      </div>
      <div className="skeleton" style={{ height: 24, width: '80%' }} />
      <div className="skeleton" style={{ height: 16, width: '95%' }} />
      <div className="skeleton" style={{ height: 16, width: '70%' }} />
    </div>
  );
}

function ResultCard({ doc, index }) {
  const navigate = useNavigate();
  const score = doc.similarity ? Math.round(doc.similarity * 100) : null;

  return (
    <div
      className="glass-panel hover-lift cursor-pointer animate-fade-in-up"
      style={{ padding: '1.4rem 1.6rem', animationDelay: `${index * 60}ms`, opacity: 0 }}
      onClick={() => navigate(`/document/${doc.id}`)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <DocBadge type={doc.doc_type} />
          <RegionBadge region={doc.region} />
          {doc.publish_year && (
            <span className="badge badge-other"><Clock size={10} />{doc.publish_year}</span>
          )}
        </div>
        {score !== null && (
          <span style={{ fontSize: '0.75rem', color: score > 70 ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={12} /> {score}% match
          </span>
        )}
      </div>

      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '0.6rem' }}>
        {doc.title}
      </h3>

      {doc.summary_en && (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {doc.summary_en}
        </p>
      )}

      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {doc.pdf_url ? (
          <a
            href={doc.pdf_url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
            style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={12} /> Open PDF
          </a>
        ) : <div />}
        <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          View Details →
        </span>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const [docType, setDocType] = useState('');
  const [region, setRegion] = useState('');
  const [department, setDepartment] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  const handleSearch = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    setHasSearched(true);
    setShowSuggestions(false);
    try {
      const data = await searchDocs({
        q: q.trim(),
        doc_type: docType || undefined,
        region: region || undefined,
        department: department || undefined,
        year_from: yearFrom ? parseInt(yearFrom) : undefined,
        year_to: yearTo ? parseInt(yearTo) : undefined,
        limit: 12
      });
      setResults(data.results || []);
    } catch (e) {
      setError('Search failed. Make sure the backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (s) => {
    setQuery(s);
    handleSearch(s);
  };

  const clearFilters = () => {
    setDocType('');
    setRegion('');
    setDepartment('');
    setYearFrom('');
    setYearTo('');
  };

  const filteredSuggestions = query.length > 0
    ? SUGGESTIONS.filter(s => s.includes(query.toLowerCase())).slice(0, 5)
    : SUGGESTIONS.slice(0, 6);

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      {/* Hero section */}
      <div
        className="flex flex-col items-center"
        style={{ minHeight: hasSearched ? 'auto' : '52vh', justifyContent: hasSearched ? 'flex-start' : 'center', marginBottom: hasSearched ? '2.5rem' : 0, transition: 'all 0.4s ease' }}
      >
        {!hasSearched && (
          <div className="text-center animate-fade-in-up" style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '999px', padding: '0.3rem 1rem', marginBottom: '1.5rem', fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
              <Sparkles size={13} /> Powered by Gemini AI · 110 Documents
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: '1rem' }}>
              India's Legal & Government<br />
              <span className="text-gradient">Intelligence Platform</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
              Search across Gujarat & Central GRs, Acts, Notifications, and Court Judgments with AI-powered semantic understanding.
            </p>
          </div>
        )}

        {/* Search bar */}
        <div className="animate-fade-in-up" style={{ maxWidth: '760px', width: '100%', position: 'relative', zIndex: 50 }}>
          <div className="glass-panel" style={{ padding: '0.4rem', display: 'flex', gap: '0.4rem', borderColor: 'var(--border-hover)' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <SearchIcon size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setShowSuggestions(true); }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                placeholder="Search laws, GRs, judgments, notifications..."
                style={{
                  width: '100%', paddingLeft: '2.8rem', paddingRight: '1rem',
                  padding: '0.85rem 1rem 0.85rem 2.8rem',
                  background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontSize: '1rem', fontFamily: 'var(--font-body)',
                }}
              />
            </div>
            <button className="btn btn-primary" onClick={() => handleSearch()} style={{ padding: '0.75rem 2rem' }}>
              Search
            </button>
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="glass-panel animate-fade-in" style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, padding: '0.5rem', zIndex: 100, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-hover)', boxShadow: '0 10px 40px rgba(0,0,0,0.6)' }}>
              {filteredSuggestions.map(s => (
                <div
                  key={s}
                  className="cursor-pointer"
                  style={{ padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(s); }}
                >
                  <SearchIcon size={14} style={{ color: 'var(--accent-primary)' }} /> {s}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick filter chips — shown on landing */}
        {!hasSearched && (
          <div className="animate-fade-in-up delay-200" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {DOC_TYPES.slice(0, 6).map(t => (
              <button key={t} className="btn btn-ghost" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => { setDocType(t); handleSearch(query || t); }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results area */}
      {hasSearched && (
        <div className="app-layout">
          {/* Filter sidebar */}
          <aside className="glass-panel" style={{ padding: '1.4rem', position: 'sticky', top: '80px', height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                <Filter size={16} color="var(--accent-primary)" /> Filters
              </div>
              {(docType || region || department || yearFrom || yearTo) && (
                <button className="btn btn-ghost" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} onClick={clearFilters}>
                  <X size={12} /> Clear
                </button>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">Document Type</label>
              <select className="input-field" value={docType} onChange={e => setDocType(e.target.value)}>
                <option value="">All Types</option>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Jurisdiction</label>
              <select className="input-field" value={region} onChange={e => setRegion(e.target.value)}>
                <option value="">All Regions</option>
                {REGIONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Department</label>
              <select className="input-field" value={department} onChange={e => setDepartment(e.target.value)}>
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Year Range</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  placeholder="From (1867)"
                  className="input-field"
                  value={yearFrom}
                  onChange={e => setYearFrom(e.target.value)}
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                />
                <input
                  type="number"
                  placeholder="To (2027)"
                  className="input-field"
                  value={yearTo}
                  onChange={e => setYearTo(e.target.value)}
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <button className="btn btn-primary w-full" style={{ marginTop: '0.5rem' }} onClick={() => handleSearch()}>
              Apply Filters
            </button>

            {/* Type legend */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Legend</p>
              {DOC_TYPES.map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <DocBadge type={t} />
                </div>
              ))}
            </div>
          </aside>

          {/* Results */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {loading ? 'Searching...' : <><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{results.length}</span> results</>}
              </p>
            </div>

            {error && (
              <div className="glass-panel" style={{ padding: '1.25rem', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
                : results.length > 0
                  ? results.map((doc, i) => <ResultCard key={doc.id} doc={doc} index={i} />)
                  : (
                    <div className="glass-panel text-center" style={{ padding: '4rem 2rem' }}>
                      <SearchIcon size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
                      <p style={{ color: 'var(--text-secondary)' }}>No results found. Try a different query or remove filters.</p>
                    </div>
                  )
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
