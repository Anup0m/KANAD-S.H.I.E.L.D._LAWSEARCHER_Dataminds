import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Scale, Search, LayoutDashboard, MessageSquare, Bell, User } from 'lucide-react';
import SearchPage from './pages/SearchPage';
import DocumentDetail from './pages/DocumentDetail';
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import { getWhatsNew } from './lib/api';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import './index.css';

function Navigation() {
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [recentDocs, setRecentDocs] = useState([]);
  const notifRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    getWhatsNew().then(setRecentDocs).catch(console.error);
    
    // Close dropdown on click outside
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (path) =>
    location.pathname === path
      ? { color: 'var(--accent-primary)', fontWeight: 600 }
      : { color: 'var(--text-secondary)' };

  return (
    <>
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(10,15,30,0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-color)',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.5rem' }}>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
          <div style={{ background: 'linear-gradient(135deg,#f59e0b,#fb923c)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
            <Scale size={20} color="#0a0f1e" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Kanan
          </span>
        </Link>

        {/* Nav Links */}
        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link to="/" className="flex items-center gap-2" style={{ ...isActive('/'), transition: 'color 0.2s', fontSize: '0.9rem', textDecoration: 'none' }}>
            <Search size={16} /> Search
          </Link>
          <Link to="/chat" className="flex items-center gap-2" style={{ ...isActive('/chat'), transition: 'color 0.2s', fontSize: '0.9rem', textDecoration: 'none' }}>
            <MessageSquare size={16} /> AI Chat
          </Link>
          <Link to="/dashboard" className="flex items-center gap-2" style={{ ...isActive('/dashboard'), transition: 'color 0.2s', fontSize: '0.9rem', textDecoration: 'none' }}>
            <LayoutDashboard size={16} /> Analytics
          </Link>
        </nav>

        {/* Right side: Notifications & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          
          {/* Notifications */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button 
              className="btn btn-ghost" 
              style={{ padding: '0.4rem', position: 'relative' }}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell size={18} color={showNotifications ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
              {recentDocs.length > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 6, width: 8, height: 8, background: '#ef4444', borderRadius: '50%' }} />
              )}
            </button>
            
            {showNotifications && (
              <div className="glass-panel animate-fade-in" style={{ position: 'absolute', top: '100%', right: 0, width: 320, marginTop: '0.5rem', padding: '0.5rem', zIndex: 110 }}>
                <h3 style={{ padding: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                  What's New (Last 7 Days)
                </h3>
                {recentDocs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: 300, overflowY: 'auto' }}>
                    {recentDocs.map(doc => (
                      <Link 
                        to={`/document/${doc.id}`} 
                        key={doc.id}
                        onClick={() => setShowNotifications(false)}
                        style={{ padding: '0.6rem', borderRadius: 8, textDecoration: 'none', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                          <span className={`badge badge-${doc.doc_type}`} style={{ fontSize: '0.65rem' }}>{doc.doc_type?.toUpperCase()}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {doc.title}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No new documents recently.</p>
                )}
              </div>
            )}
          </div>

          {/* User Auth / Profile */}
          {user ? (
            <Link to="/profile" className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
              <User size={18} />
            </Link>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
              Sign In
            </button>
          )}

          {/* Status pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '999px', padding: '0.3rem 0.8rem', fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }}></span>
            110 Docs Indexed
          </div>
        </div>
      </div>
    </header>
    <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
  </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
          <Navigation />
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/document/:id" element={<DocumentDetail />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
