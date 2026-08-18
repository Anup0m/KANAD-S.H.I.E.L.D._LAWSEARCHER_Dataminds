import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileText, Clock, Scale, BookOpen, Copy, Check, Bookmark, BookmarkCheck, Download, Link as LinkIcon, Building, Tag } from 'lucide-react';
import { getDoc, BASE_URL } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { SummaryExportCard } from '../components/SummaryExportCard';

const TYPE_COLORS = {
  act: '#10b981', gr: '#60a5fa', notification: '#fbbf24',
  judgment: '#a78bfa', circular: '#2dd4bf', rules: '#818cf8', other: '#94a3b8'
};

function MetaRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }}>{icon}</span>
      <div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{label}</p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{value}</p>
      </div>
    </div>
  );
}

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const printRef = React.useRef(null);

  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [checkingBookmark, setCheckingBookmark] = useState(true);

  useEffect(() => {
    getDoc(id).then(setDoc).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user && id) {
      supabase.from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('document_id', id)
        .single()
        .then(({ data }) => {
          if (data) setIsBookmarked(true);
        })
        .finally(() => setCheckingBookmark(false));
    } else {
      setCheckingBookmark(false);
    }
  }, [user, id]);

  const toggleBookmark = async () => {
    if (!user) return alert("Please log in to bookmark documents.");
    
    if (isBookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('document_id', id);
      setIsBookmarked(false);
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, document_id: id });
      setIsBookmarked(true);
    }
  };

  const handleShare = () => {
    // We copy the backend URL for Open Graph metadata sharing
    const shareUrl = `${BASE_URL}/share/${id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: '#0a0f1e',
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: printRef.current.scrollWidth,
        windowHeight: printRef.current.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4'); // A4 size
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Kanan_Summary_${doc.title.substring(0, 20).replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("Failed to export PDF", err);
      alert("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return (
    <div className="container" style={{ paddingTop: '3rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 380px', gap: '2rem' }}>
        <div className="skeleton" style={{ height: '85vh', borderRadius: 16 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 280, borderRadius: 16 }} />
        </div>
      </div>
    </div>
  );

  if (!doc) return (
    <div className="container text-center" style={{ paddingTop: '5rem' }}>
      <p style={{ color: 'var(--text-secondary)' }}>Document not found.</p>
    </div>
  );

  const color = TYPE_COLORS[doc.doc_type] || '#94a3b8';
  const regionLabel = doc.region === 'gujarat' ? '🏛 Gujarat' : doc.region === 'central' ? '🇮🇳 Central' : doc.region;

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
        <ArrowLeft size={16} /> Back to Results
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 380px', gap: '2rem', alignItems: 'start' }}>
        {/* PDF Viewer */}
        <div className="glass-panel animate-fade-in" style={{ height: '85vh', overflow: 'hidden', padding: 0 }}>
          {doc.pdf_url ? (
            <iframe
              src={doc.pdf_url}
              title="PDF Viewer"
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 16 }}
            />
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
              <FileText size={40} />
              <p>No PDF preview available</p>
              {doc.source_url && <p style={{ fontSize: '0.8rem' }}>Source: {doc.source_url}</p>}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Main info card */}
          <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem' }}>
            {/* Type badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <span className={`badge badge-${doc.doc_type}`} style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {doc.doc_type?.toUpperCase()}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {doc.pdf_url && (
                  <a href={doc.pdf_url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}>
                    <ExternalLink size={13} /> Open PDF
                  </a>
                )}
                <button className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }} onClick={handleExportPDF} disabled={isExporting}>
                  <Download size={13} /> {isExporting ? 'Exporting...' : 'Export PDF'}
                </button>
                <button className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }} onClick={toggleBookmark} disabled={checkingBookmark}>
                  {isBookmarked ? <BookmarkCheck size={13} fill="currentColor" /> : <Bookmark size={13} />}
                  {isBookmarked ? 'Saved' : 'Save'}
                </button>
                <button className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }} onClick={handleShare}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Share'}
                </button>
              </div>
            </div>

            {/* Title */}
            <h1 style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.4, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
              {doc.title}
            </h1>

            {/* Meta */}
            <div style={{ borderTop: '1px solid var(--border-color)' }}>
              <MetaRow icon={<Clock size={14} />} label="Year" value={doc.publish_year?.toString()} />
              <MetaRow icon={<Scale size={14} />} label="Jurisdiction" value={regionLabel} />
              <MetaRow icon={<FileText size={14} />} label="Type" value={doc.doc_type?.charAt(0).toUpperCase() + doc.doc_type?.slice(1)} />
              {doc.department && <MetaRow icon={<Building size={14} />} label="Department" value={doc.department} />}
            </div>

            {/* Keywords */}
            {doc.keywords && (Array.isArray(doc.keywords) ? doc.keywords : (typeof doc.keywords === 'string' ? JSON.parse(doc.keywords || '[]') : [])).length > 0 && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Extracted Keywords</span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {(Array.isArray(doc.keywords) ? doc.keywords : JSON.parse(doc.keywords || '[]')).map((kw, i) => (
                    <span key={i} style={{ fontSize: '0.72rem', color: '#ffffff', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                      <Tag size={10} style={{ display: 'inline', marginRight: 4 }} />{kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Referenced Acts / Citations */}
            {doc.referenced_acts && (Array.isArray(doc.referenced_acts) ? doc.referenced_acts : (typeof doc.referenced_acts === 'string' ? JSON.parse(doc.referenced_acts || '[]') : [])).length > 0 && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cited Acts & Precedents</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                  {(Array.isArray(doc.referenced_acts) ? doc.referenced_acts : JSON.parse(doc.referenced_acts || '[]')).map((act, i) => (
                    <div key={i} style={{ fontSize: '0.8rem', color: '#ffffff', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem 0.75rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <LinkIcon size={12} color="#ffffff" /> {act}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Summary */}
          {doc.summary_en && (
            <div className="glass-panel animate-fade-in delay-100" style={{ padding: '1.25rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.85rem', color: '#ffffff' }}>
                <BookOpen size={15} /> AI Summary
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {doc.summary_en}
              </p>
            </div>
          )}

          {/* Full Extracted Document Text */}
          {doc.content && (
            <div className="glass-panel animate-fade-in delay-200" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#ffffff' }}>
                  <FileText size={15} /> Full Extracted OCR Text
                </h3>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => navigator.clipboard.writeText(doc.content)}
                >
                  <Copy size={12} /> Copy Text
                </button>
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto', background: 'rgba(0,0,0,0.5)', padding: '0.875rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {doc.content}
                </p>
              </div>
            </div>
          )}
          
          {/* Related Documents (Cross-linking) */}
          {doc.related_documents && doc.related_documents.length > 0 && (
            <div className="glass-panel animate-fade-in delay-300" style={{ padding: '1.25rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.85rem', color: 'var(--text-secondary)' }}>
                <LinkIcon size={15} /> Related Documents
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {doc.related_documents.map(rd => (
                  <Link key={rd.id} to={`/document/${rd.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', transition: 'all 0.2s' }}
                         onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                         onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span className={`badge badge-${rd.doc_type}`} style={{ fontSize: '0.65rem' }}>
                          {rd.doc_type?.toUpperCase()}
                        </span>
                        {rd.publish_year && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{rd.publish_year}</span>}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                        {rd.title}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Hidden component for PDF generation */}
      <SummaryExportCard ref={printRef} doc={doc} />
    </div>
  );
}
