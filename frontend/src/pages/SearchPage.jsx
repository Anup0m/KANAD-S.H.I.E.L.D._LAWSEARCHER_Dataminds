import React, { useState, useRef, useEffect } from 'react';
import { Search as SearchIcon, Filter, FileText, ExternalLink, Clock, ChevronDown, X, Sparkles, Scale, BookOpen, Gavel, Link as LinkIcon, Tag, Building } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { searchDocs, getStats } from '../lib/api';

const DOC_TYPES = ['act', 'gr', 'notification', 'judgment', 'circular', 'rules', 'scheme', 'other'];
const REGIONS = ['gujarat', 'central'];
const DEPARTMENTS = ['Revenue Department', 'Education Department', 'Home Department', 'Finance Department', 'Health Department', 'General Administration Department'];

const SUGGESTIONS = [
  'land acquisition rules', 'pension policy Gujarat', 'stamp duty amendment',
  'fix pay rules', 'disability act 2016', 'district planning committees',
  'civil services rules', 'revenue jurisdiction',
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

function ResultCard({ doc, index, onTagClick }) {
  const navigate = useNavigate();
  const score = doc.similarity ? Math.round(doc.similarity * 100) : null;
  const keywords = Array.isArray(doc.keywords) ? doc.keywords : (typeof doc.keywords === 'string' ? JSON.parse(doc.keywords || '[]') : []);
  const refActs = Array.isArray(doc.referenced_acts) ? doc.referenced_acts : (typeof doc.referenced_acts === 'string' ? JSON.parse(doc.referenced_acts || '[]') : []);

  return (
    <div
      className="glass-panel hover-lift cursor-pointer animate-fade-in-up"
      style={{
        padding: '1.5rem 1.6rem',
        animationDelay: `${index * 60}ms`,
        opacity: 0,
        position: 'relative',
        overflow: 'hidden',
        borderLeft: '4px solid #ffffff'
      }}
      onClick={() => navigate(`/document/${doc.id}`)}
    >
      {/* Subtle card top accent line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: 'linear-gradient(90deg, #ffffff 0%, #71717a 50%, transparent 100%)'
      }} />

      {/* Card Header badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <DocBadge type={doc.doc_type} />
          <RegionBadge region={doc.region} />
          {doc.publish_year && (
            <span className="badge badge-other"><Clock size={10} />{doc.publish_year}</span>
          )}
          {doc.department && (
            <span className="badge badge-circular" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
              <Building size={11} /> {doc.department}
            </span>
          )}
        </div>

        {score !== null && (
          <span style={{
            fontSize: '0.75rem',
            color: '#34d399',
            background: 'rgba(52,211,153,0.12)',
            border: '1px solid rgba(52,211,153,0.4)',
            padding: '0.2rem 0.65rem',
            borderRadius: '999px',
            fontWeight: 800,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <Sparkles size={11} /> {score}% AI Match
          </span>
        )}
      </div>

      {/* Title with inline colorful type badge option */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.6rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.4, margin: 0 }}>
          {doc.title}
        </h3>
      </div>

      {/* Summary */}
      {doc.summary_en && (
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.65,
          marginBottom: '0.8rem',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {doc.summary_en}
        </p>
      )}


      {/* Keywords Tags */}
      {keywords.length > 0 && (
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
          {keywords.slice(0, 5).map((kw, i) => (
            <span
              key={i}
              onClick={(e) => { e.stopPropagation(); onTagClick && onTagClick(kw); }}
              style={{
                fontSize: '0.7rem',
                color: '#e4e4e7',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                padding: '0.15rem 0.55rem',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#000000'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#e4e4e7'; }}
            >
              <Tag size={10} /> {kw}
            </span>
          ))}
        </div>
      )}

      {/* Card Footer Actions */}
      <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
        {doc.pdf_url && (
          <a
            href={doc.pdf_url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
            style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={13} /> View Original PDF
          </a>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const query = searchParams.get('q') || '';
  const docType = searchParams.get('docType') || '';
  const region = searchParams.get('region') || '';
  const department = searchParams.get('department') || '';
  const yearFrom = searchParams.get('yearFrom') || '';
  const yearTo = searchParams.get('yearTo') || '';
  
  const [localQuery, setLocalQuery] = useState(query);
  const [localDocType, setLocalDocType] = useState(docType);
  const [localRegion, setLocalRegion] = useState(region);
  const [localDepartment, setLocalDepartment] = useState(department);
  const [localYearFrom, setLocalYearFrom] = useState(yearFrom);
  const [localYearTo, setLocalYearTo] = useState(yearTo);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [docCount, setDocCount] = useState(136);

  useEffect(() => {
    getStats().then(s => { if (s && s.total_documents) setDocCount(s.total_documents); }).catch(console.error);
  }, []);

  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // If URL has search params on mount/change, execute search
    if (query || docType || region || department || yearFrom || yearTo) {
      setHasSearched(true);
      executeSearch();
    }
  }, [searchParams]);

  const executeSearch = async () => {
    setLoading(true);
    setError('');
    setShowSuggestions(false);
    try {
      const data = await searchDocs({
        q: query,
        doc_type: docType,
        region,
        department,
        year_from: yearFrom ? parseInt(yearFrom) : undefined,
        year_to: yearTo ? parseInt(yearTo) : undefined,
        limit: 12
      });
      setResults(data.results || []);
    } catch (e) {
      setError('Search failed. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const applySearch = (updates = {}) => {
    const newParams = new URLSearchParams(searchParams);
    
    const nextQ = updates.q !== undefined ? updates.q : localQuery;
    const nextDocType = updates.docType !== undefined ? updates.docType : localDocType;
    const nextRegion = updates.region !== undefined ? updates.region : localRegion;
    const nextDepartment = updates.department !== undefined ? updates.department : localDepartment;
    const nextYearFrom = updates.yearFrom !== undefined ? updates.yearFrom : localYearFrom;
    const nextYearTo = updates.yearTo !== undefined ? updates.yearTo : localYearTo;

    if (nextQ) newParams.set('q', nextQ); else newParams.delete('q');
    if (nextDocType) newParams.set('docType', nextDocType); else newParams.delete('docType');
    if (nextRegion) newParams.set('region', nextRegion); else newParams.delete('region');
    if (nextDepartment) newParams.set('department', nextDepartment); else newParams.delete('department');
    if (nextYearFrom) newParams.set('yearFrom', nextYearFrom); else newParams.delete('yearFrom');
    if (nextYearTo) newParams.set('yearTo', nextYearTo); else newParams.delete('yearTo');

    setSearchParams(newParams);
  };

  const handleSuggestionClick = (s) => {
    setLocalQuery(s);
    applySearch({ q: s });
  };

  const clearFilters = () => {
    setLocalDocType('');
    setLocalRegion('');
    setLocalDepartment('');
    setLocalYearFrom('');
    setLocalYearTo('');
    applySearch({ docType: '', region: '', department: '', yearFrom: '', yearTo: '' });
  };

  const filteredSuggestions = localQuery.length > 0
    ? SUGGESTIONS.filter(s => s.toLowerCase().includes(localQuery.toLowerCase())).slice(0, 5)
    : SUGGESTIONS.slice(0, 6);

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>
      {/* Hero section */}
      <div
        className="flex flex-col items-center"
        style={{ minHeight: hasSearched ? 'auto' : '48vh', justifyContent: hasSearched ? 'flex-start' : 'center', marginBottom: hasSearched ? '2.5rem' : 0, transition: 'all 0.4s ease' }}
      >
        {!hasSearched && (
          <div className="text-center animate-fade-in-up" style={{ marginBottom: '2.2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px', padding: '0.35rem 1.1rem', marginBottom: '1.5rem', fontSize: '0.78rem', color: '#ffffff', fontWeight: 600 }}>
              <Sparkles size={13} color="#ffffff" /> Powered by Gemini AI · {docCount} Live Documents
            </div>
            
            <div style={{ marginBottom: '1.2rem' }}>
              <div className="hero-lawsearcher-title">
                <span className="hero-law-tag">LAW</span>
                <span className="vertical-bw-stripe"></span>
                <span className="hero-searcher-tag">SEARCHER</span>
              </div>
            </div>

            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: '1rem' }}>
              India's Unified Legal & Government<br />
              <span className="text-gradient">Intelligence Platform</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.7 }}>
              Instant AI semantic search across Gujarat & Central GRs, State Acts, Notifications, and Judicial Orders.
            </p>
          </div>
        )}

        {/* Search bar */}
        <div className="animate-fade-in-up" style={{ maxWidth: '780px', width: '100%', position: 'relative', zIndex: 50 }}>
          <div className="glass-panel" style={{ padding: '0.45rem', display: 'flex', gap: '0.4rem', borderColor: 'var(--border-hover)' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <SearchIcon size={18} style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                ref={inputRef}
                type="text"
                value={localQuery}
                onChange={e => { setLocalQuery(e.target.value); setShowSuggestions(true); }}
                onKeyDown={e => e.key === 'Enter' && applySearch()}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                placeholder="Search laws, GRs, judgments, notifications..."
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem 0.85rem 2.9rem',
                  background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontSize: '1.02rem', fontFamily: 'var(--font-body)',
                }}
              />
            </div>
            <button className="btn btn-primary" onClick={() => applySearch()} style={{ padding: '0.75rem 2.2rem' }}>
              Search
            </button>
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="glass-panel animate-fade-in" style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, padding: '0.5rem', zIndex: 100, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-hover)', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
              {filteredSuggestions.map(s => (
                <div
                  key={s}
                  onMouseDown={() => handleSuggestionClick(s)}
                  style={{ padding: '0.6rem 1rem', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: 'var(--text-secondary)', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <SearchIcon size={14} /> {s}
                </div>
              ))}
            </div>
          )}

          {/* Preset Category Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1.2rem' }}>
            {['act', 'gr', 'notification', 'judgment', 'circular', 'rules'].map(type => (
              <button
                key={type}
                onClick={() => { 
                  const nextDocType = type === localDocType ? '' : type;
                  setLocalDocType(nextDocType);
                  applySearch({ docType: nextDocType });
                }}
                className="btn btn-ghost"
                style={{
                  padding: '0.35rem 0.9rem',
                  fontSize: '0.78rem',
                  borderRadius: '999px',
                  background: localDocType === type ? '#ffffff' : 'rgba(255,255,255,0.04)',
                  color: localDocType === type ? '#000000' : '#e4e4e7',
                  borderColor: localDocType === type ? '#ffffff' : 'rgba(255,255,255,0.15)',
                  fontWeight: localDocType === type ? 800 : 500
                }}
              >
                {TYPE_ICONS[type]} {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results & Filters Layout */}
      {hasSearched && (
        <div className="app-layout">
          {/* Filters Sidebar */}
          <aside className="glass-panel" style={{ padding: '1.5rem', position: 'sticky', top: '5.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Filter size={16} /> Filters
              </h3>
              {(localDocType || localRegion || localDepartment || localYearFrom || localYearTo) && (
                <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                  Clear all
                </button>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">Document Type</label>
              <select className="input-field" value={localDocType} onChange={e => setLocalDocType(e.target.value)}>
                <option value="">All Types</option>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Jurisdiction</label>
              <select className="input-field" value={localRegion} onChange={e => setLocalRegion(e.target.value)}>
                <option value="">All Regions</option>
                {REGIONS.map(r => <option key={r} value={r}>{r === 'gujarat' ? 'Gujarat State' : 'Central Govt'}</option>)}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Department</label>
              <select className="input-field" value={localDepartment} onChange={e => setLocalDepartment(e.target.value)}>
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Year Range</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number" className="input-field" placeholder="From (1867)"
                  value={localYearFrom} onChange={e => setLocalYearFrom(e.target.value)}
                />
                <input
                  type="number" className="input-field" placeholder="To (2027)"
                  value={localYearTo} onChange={e => setLocalYearTo(e.target.value)}
                />
              </div>
            </div>

            <button className="btn btn-primary w-full" onClick={() => applySearch()} style={{ marginTop: '0.5rem' }}>
              Apply Filters
            </button>
          </aside>

          {/* Results Column */}
          <main>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {loading ? 'Searching legal database...' : `${results.length} legal records found`}
              </p>
            </div>

            {error && (
              <div className="glass-panel" style={{ padding: '1.2rem', borderColor: 'rgba(239,68,68,0.4)', color: '#f87171', marginBottom: '1.5rem' }}>
                {error}
              </div>
            )}

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <SkeletonCard /><SkeletonCard /><SkeletonCard />
              </div>
            ) : results.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {results.map((doc, i) => (
                  <ResultCard key={doc.id || i} doc={doc} index={i} onTagClick={(tag) => { setLocalQuery(tag); applySearch({ q: tag }); }} />
                ))}
              </div>
            ) : (
              <div className="glass-panel text-center" style={{ padding: '3rem 1.5rem' }}>
                <FileText size={40} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No legal records found</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Try broadening your search query or removing active filters.</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

