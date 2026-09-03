import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { apiClient } from '../api/client';

export const StudentAnalytics = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient('/students')
      
      .then(data => {
        // Calculate mocked growth/engagement based on db stats to match original analytics UI
        const analyticsData = data.map(s => {
          const currentLevel = s.level || 'Beginner';
          const currentRating = s.rating || 1200;
          
          // Generate deterministic mock growth based on id
          const growth = '+' + ((s.id * 7) % 50); 
          const engagement = 50 + ((s.id * 13) % 50);
          
          return { ...s, currentLevel, currentRating, growth: growth, engagement: engagement };
        });
        setStudents(analyticsData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load students:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px', color: 'var(--text-main)' }}>Student Intelligence</h1>
          <p style={{ color: 'var(--text-muted)' }}>Detailed performance metrics and growth tracking for every player.</p>
        </div>
        <button className="btn btn-primary">
          <Download size={16} /> Export Reports
        </button>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Student</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Level</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Rating</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Growth (30d)</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Engagement</th>
                <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading analytics data...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No students found.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px 20px', color: 'var(--text-main)', fontWeight: 500 }}>{s.name}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>{s.currentLevel}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-main)', fontWeight: 500 }}>{s.currentRating}</td>
                    <td style={{ padding: '16px 20px', color: '#10b981', fontWeight: 500 }}>{s.growth}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: s.engagement === 'N/A' ? '0%' : `${s.engagement}`, height: '100%', background: s.engagement > 80 ? '#10b981' : '#3b82f6' }}></div>
                        </div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.engagement}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}>View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
