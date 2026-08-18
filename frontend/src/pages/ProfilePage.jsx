import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Bookmark, Search, Bell, LogOut, Trash2, Plus } from 'lucide-react';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [bookmarks, setBookmarks] = useState([]);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch Bookmarks (requires joining with documents)
    const { data: bData } = await supabase
      .from('bookmarks')
      .select('id, documents (id, title, doc_type, region)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (bData) setBookmarks(bData);

    // Fetch History
    const { data: hData } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (hData) setHistory(hData);

    // Fetch Alerts
    const { data: aData } = await supabase
      .from('user_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (aData) setAlerts(aData);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const addAlert = async (e) => {
    e.preventDefault();
    if (!newKeyword.trim() || !user) return;
    
    await supabase.from('user_alerts').insert({
      user_id: user.id,
      keyword: newKeyword.trim()
    });
    setNewKeyword('');
    fetchData();
  };

  const deleteAlert = async (id) => {
    await supabase.from('user_alerts').delete().eq('id', id);
    fetchData();
  };

  const deleteBookmark = async (id) => {
    await supabase.from('bookmarks').delete().eq('id', id);
    fetchData();
  };

  if (!user) return null;

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>My Profile</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
        </div>
        <button onClick={handleSignOut} className="btn btn-ghost" style={{ padding: '0.5rem 1rem', color: '#ef4444' }}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Bookmarks & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Bookmarks */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Bookmark size={18} color="var(--accent-primary)" /> Saved Documents
            </h2>
            {bookmarks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No saved documents yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {bookmarks.map(b => {
                  const doc = b.documents;
                  if (!doc) return null;
                  return (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                      <Link to={`/document/${doc.id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)', flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                          <span className={`badge badge-${doc.doc_type}`} style={{ fontSize: '0.6rem' }}>{doc.doc_type?.toUpperCase()}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</p>
                      </Link>
                      <button onClick={() => deleteBookmark(b.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search History */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Search size={18} color="var(--accent-primary)" /> Recent Searches
            </h2>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No search history.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {history.map(h => (
                  <li key={h.id} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>"{h.query_text}"</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(h.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column: Alerts */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Bell size={18} color="var(--accent-primary)" /> Keyword Alerts
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Get notified when new documents are published matching your keywords.
          </p>

          <form onSubmit={addAlert} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="e.g. land acquisition"
              className="search-input"
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0 1rem' }}>
              <Plus size={16} /> Add
            </button>
          </form>

          {alerts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No alerts set up.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {alerts.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{a.keyword}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: a.is_active ? '#10b981' : 'var(--text-muted)' }}>
                      {a.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={() => deleteAlert(a.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
