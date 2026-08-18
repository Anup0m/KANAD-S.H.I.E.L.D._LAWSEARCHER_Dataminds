import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, User, Scale, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';
import { chatQuery } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const STARTER_QUESTIONS = [
  'What is the process for land acquisition in Gujarat?',
  'How is stamp duty calculated on property?',
  'What are the rules for government employee pension?',
  'What does the Bombay Revenue Jurisdiction Act say?',
  'What are the medical establishment registration requirements?',
];

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)',
          animation: 'pulse 1.4s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`
        }} />
      ))}
    </div>
  );
}

function MessageBubble({ msg }) {
  const navigate = useNavigate();
  const isUser = msg.role === 'user';
  return (
    <div className="animate-fade-in-up" style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      gap: '0.4rem', marginBottom: '1.25rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', flexDirection: isUser ? 'row-reverse' : 'row', maxWidth: '85%' }}>
        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: isUser ? 'var(--accent-primary)' : 'rgba(59,130,246,0.2)',
          border: `1px solid ${isUser ? 'var(--accent-primary)' : 'rgba(59,130,246,0.4)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: isUser ? '#0a0f1e' : '#60a5fa',
        }}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Bubble */}
        <div style={{
          padding: '0.875rem 1.1rem',
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background: isUser ? 'linear-gradient(135deg,var(--accent-primary),#fb923c)' : 'var(--glass-bg)',
          border: isUser ? 'none' : '1px solid var(--glass-border)',
          color: isUser ? '#0a0f1e' : 'var(--text-primary)',
          fontSize: '0.9rem', lineHeight: 1.7,
        }}>
          {msg.loading ? <TypingDots /> : msg.content}
        </div>
      </div>

      {/* Sources */}
      {msg.sources?.length > 0 && (
        <div style={{ maxWidth: '85%', marginLeft: 40 }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sources used</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {msg.sources.map(src => (
              <button key={src.id}
                onClick={() => navigate(`/document/${src.id}`)}
                style={{
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                  borderRadius: '8px', padding: '0.5rem 0.85rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                  fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'left',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Scale size={12} color="var(--accent-primary)" />
                  {src.title}
                </span>
                <ExternalLink size={11} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (q = input) => {
    if (!q.trim() || loading) return;
    const question = q.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    // Optimistic loading bubble
    const loadingId = Date.now();
    setMessages(prev => [...prev, { role: 'assistant', content: '', loading: true, id: loadingId }]);

    try {
      const data = await chatQuery(question);
      setMessages(prev => prev.map(m => m.id === loadingId
        ? { role: 'assistant', content: data.answer, sources: data.sources || [] }
        : m
      ));
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === loadingId
        ? { role: 'assistant', content: '⚠️ Failed to get a response. Make sure the backend is running on port 8000.' }
        : m
      ));
    } finally {
      setLoading(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem', maxWidth: 860 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <MessageSquare size={28} color="var(--accent-primary)" />
          AI Legal <span className="text-gradient" style={{ marginLeft: '0.3rem' }}>Assistant</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
          Ask anything about Gujarat & Central laws. Answers are cited from our document index.
        </p>
      </div>

      {/* Chat window */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '72vh' }}>
        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {isEmpty && (
            <div className="animate-fade-in" style={{ textAlign: 'center', paddingTop: '3rem' }}>
              <div style={{ background: 'rgba(245,158,11,0.12)', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Sparkles size={28} color="var(--accent-primary)" />
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                Ask a legal question or try one of these:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxWidth: 480, margin: '0 auto' }}>
                {STARTER_QUESTIONS.map(q => (
                  <button key={q} className="btn btn-ghost" style={{ textAlign: 'left', justifyContent: 'flex-start', padding: '0.7rem 1.1rem', fontSize: '0.85rem' }}
                    onClick={() => sendMessage(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
          <div ref={bottomRef} />
        </div>

        {/* Disclaimer bar */}
        <div style={{ padding: '0.5rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertCircle size={12} color="var(--text-muted)" />
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>AI answers are for informational purposes. Always verify with original documents.</p>
        </div>

        {/* Input bar */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.6rem' }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask a legal question..."
            style={{
              flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              borderRadius: '10px', padding: '0.75rem 1rem', color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
          />
          <button className="btn btn-primary" onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ padding: '0.75rem 1.25rem' }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
