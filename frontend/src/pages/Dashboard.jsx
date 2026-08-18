import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FileText, Scale, Gavel, BookOpen, Activity, TrendingUp, Database, Search } from 'lucide-react';
import { getStats, getTrending } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const TYPE_COLORS = {
  act: '#10b981', gr: '#3b82f6', notification: '#f59e0b',
  judgment: '#8b5cf6', circular: '#14b8a6', rules: '#6366f1', other: '#64748b'
};

const TYPE_ICONS = {
  act: <Scale size={16} />, gr: <FileText size={16} />,
  notification: <BookOpen size={16} />, judgment: <Gavel size={16} />,
  circular: <BookOpen size={16} />, rules: <FileText size={16} />, other: <Activity size={16} />
};

function StatCard({ icon, label, value, color, subtitle }) {
  return (
    <div className="glass-panel hover-lift" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      <div style={{ background: `${color}20`, padding: '0.75rem', borderRadius: '10px', color, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>{label}</p>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</h2>
        {subtitle && <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    const { name, value } = payload[0];
    return (
      <div className="glass-panel" style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
        <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name?.toUpperCase()}</p>
        <p style={{ color: 'var(--text-secondary)' }}>{value} documents</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getStats(), getTrending().catch(() => [])])
      .then(([statsData, trendingData]) => {
        setStats(statsData);
        setTrending(trendingData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pieData = stats
    ? Object.entries(stats.by_type || {}).map(([name, value]) => ({ name, value }))
    : [];

  const topTypes = [...pieData].sort((a, b) => b.value - a.value);

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginBottom: '0.4rem' }}>
          Analytics <span className="text-gradient">Dashboard</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Real-time insights from the Kanan document index</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard icon={<Database size={20} />} label="Total Documents" value={loading ? '—' : stats?.total || 0} color="#f59e0b" subtitle="Indexed & searchable" />
        <StatCard icon={<Scale size={20} />} label="Acts & Laws" value={loading ? '—' : stats?.by_type?.act || 0} color="#10b981" subtitle="Gujarat + Central" />
        <StatCard icon={<FileText size={20} />} label="GRs" value={loading ? '—' : stats?.by_type?.gr || 0} color="#3b82f6" subtitle="Government Resolutions" />
        <StatCard icon={<Gavel size={20} />} label="Judgments" value={loading ? '—' : stats?.by_type?.judgment || 0} color="#8b5cf6" subtitle="Court orders & rulings" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Pie Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} color="var(--accent-primary)" /> Document Breakdown
          </h3>
          {loading ? (
            <div className="skeleton" style={{ height: 280, borderRadius: 12 }} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={110} paddingAngle={3} dataKey="value">
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar breakdown */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="var(--accent-secondary)" /> Category Breakdown
          </h3>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 36, borderRadius: 8, marginBottom: '0.6rem' }} />)
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {topTypes.map(({ name, value }) => {
                const pct = stats?.total ? Math.round((value / stats.total) * 100) : 0;
                const color = TYPE_COLORS[name] || '#64748b';
                return (
                  <div key={name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.82rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        <span style={{ color }}>{TYPE_ICONS[name]}</span>
                        {name.charAt(0).toUpperCase() + name.slice(1)}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 9999, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 9999, transition: 'width 1s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Trending Searches */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Search size={16} /> Trending Searches
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ width: 100 + Math.random() * 50, height: 32, borderRadius: 16 }} />)
            ) : trending.length > 0 ? (
              trending.map((t) => (
                <button key={t.query} className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  onClick={() => navigate(`/?q=${encodeURIComponent(t.query)}`)}>
                  {t.query}
                  <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '10px', fontSize: '0.65rem' }}>{t.count}</span>
                </button>
              ))
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No trending searches yet.</p>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Examples</h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {['land acquisition', 'pension rules', 'stamp duty', 'medical act', 'education policy', 'revenue jurisdiction'].map(q => (
              <button key={q} className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '0.4rem 1rem' }}
                onClick={() => navigate(`/?q=${encodeURIComponent(q)}`)}>
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
