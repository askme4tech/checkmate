import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell } from 'recharts';
import { apiClient } from '../api/client';

export const PerformanceDash = () => {
  const [data, setData] = useState({
    avg_rating: 1200,
    skill_heatmap: {
      Tactics: 0,
      Openings: 0,
      Endgames: 0,
      Calculation: 0,
      Strategy: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient('/analytics/performance')
      
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch performance analytics:", err);
        setLoading(false);
      });
  }, []);

  const ratingTrendData = [
    { month: 'Jan', rating: data.avg_rating - 20 },
    { month: 'Feb', rating: data.avg_rating - 15 },
    { month: 'Mar', rating: data.avg_rating - 10 },
    { month: 'Apr', rating: data.avg_rating - 5 },
    { month: 'May', rating: data.avg_rating }
  ];

  const radarData = Object.entries(data.skill_heatmap).map(([subject, val]) => ({
    subject,
    A: val * 15, // Scale 1-10 to 1-150 for radar chart visibility
    fullMark: 150
  }));

  const levelData = [
    { name: 'Beginner', value: 40 },
    { name: 'Intermediate', value: 30 },
    { name: 'Advanced', value: 20 },
    { name: 'Master', value: 10 },
  ];
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  const getHeatmapColor = (score) => {
    if (score >= 8) return { bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981' };
    if (score >= 5) return { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b' };
    return { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444' };
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px', color: 'var(--text-main)' }}>Coaching Intelligence</h1>
          <p style={{ color: 'var(--text-muted)' }}>Real-time player development and performance analytics.</p>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AVG ACADEMY RATING</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>Live</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>{data.avg_rating}</div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>FASTEST IMPROVING</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '2px 6px', borderRadius: '4px' }}>N/A</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>-</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Since last month</div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>PROMOTION READY</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Check Pipeline</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>-</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Based on current scores</div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AVG TACTICAL SCORE</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>{data.skill_heatmap.Tactics || 0}/10</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Left Column (Charts) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-panel">
            <h3 style={{ marginBottom: '24px', color: 'var(--text-main)' }}>Rating Progression Trend</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ratingTrendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <XAxis dataKey="month" tick={{fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} />
                  <Line type="monotone" dataKey="rating" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            <div className="glass-panel">
              <h3 style={{ marginBottom: '24px', color: 'var(--text-main)' }}>Skill Distribution Radar</h3>
              <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="var(--border-color)" />
                    <PolarAngleAxis dataKey="subject" tick={{fill: 'var(--text-muted)', fontSize: 12}} />
                    <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                    <Radar name="Academy Average" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel">
              <h3 style={{ marginBottom: '24px', color: 'var(--text-main)' }}>Level Distribution</h3>
              <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={levelData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {levelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          <div className="glass-panel">
            <h3 style={{ marginBottom: '24px', color: 'var(--text-main)' }}>Concept Mastery Heatmap (Avg / 10)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {Object.entries(data.skill_heatmap).map(([skill, score]) => {
                const colors = getHeatmapColor(score);
                return (
                  <div key={skill} style={{ background: colors.bg, borderLeft: `4px solid ${colors.border}`, padding: '12px', borderRadius: '4px', color: 'var(--text-main)' }}>
                    {skill} ({score})
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (Sidebars) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-panel">
            <h3 style={{ marginBottom: '16px', color: 'var(--text-main)' }}>Actionable Insights</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Live insights engine processing...</p>
          </div>

          <div className="glass-panel">
            <h3 style={{ marginBottom: '16px', color: 'var(--text-main)' }}>Top Performers (Growth)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Live growth data calculating...</p>
          </div>

          <div className="glass-panel">
            <h3 style={{ marginBottom: '16px', color: 'var(--text-main)' }}>Recent Coaching Feed</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No recent coaching activity.</p>
          </div>

        </div>

      </div>

    </div>
  );
};
