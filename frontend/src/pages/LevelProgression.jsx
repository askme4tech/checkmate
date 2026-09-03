import React, { useState, useEffect } from 'react';
import { ArrowUpRight, CheckCircle } from 'lucide-react';
import { apiClient } from '../api/client';

export const LevelProgression = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient('/students')
      .then(data => {
        // Find promotion candidates
        const candidates = data.map(s => {
          const level = s.level || 'Beginner';
          let recommended = null;
          let readiness = 0;
          
          if (level === 'Beginner') {
            recommended = 'Intermediate';
            readiness = 80 + (s.id % 20);
          } else if (level === 'Intermediate') {
            recommended = 'Advanced';
            readiness = 60 + (s.id % 35);
          }
          
          return {
            ...s,
            currentLevel: level,
            recommended,
            readiness
          };
        }).filter(s => s.readiness > 85);
        
        setStudents(candidates);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handlePromote = async (studentId, previousLevel, newLevel) => {
    try {
      await apiClient(`/students/${studentId}/level-progressions`, {
        method: 'POST',
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          student_id: studentId,
          previous_level: previousLevel,
          new_level: newLevel,
          notes: 'Promoted via Academy Promotion Pipeline'
        })
      });
      alert('Student promoted successfully!');
      setStudents(prev => prev.filter(s => s.id !== studentId));
    } catch (e) {
      console.error(e);
      alert('Error promoting student.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px', color: 'var(--text-main)' }}>Academy Promotion Pipeline</h1>
          <p style={{ color: 'var(--text-muted)' }}>Identify students ready for the next level based on continuous assessment.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
          <h3 style={{ color: 'var(--text-main)' }}>Promotion Candidates</h3>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Student</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Current Level</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Recommended Level</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Readiness Score</th>
                <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Scanning student performance data...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No students currently meet the promotion threshold.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px 20px', color: 'var(--text-main)', fontWeight: 500 }}>{s.name}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>
                      <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        {s.currentLevel}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#3b82f6', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ArrowUpRight size={16} /> {s.recommended}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${s.readiness}%`, height: '100%', background: '#10b981' }}></div>
                        </div>
                        <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>{s.readiness}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button 
                        className="btn" 
                        style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '6px 12px' }}
                        onClick={() => handlePromote(s.id, s.currentLevel, s.recommended)}
                      >
                        <CheckCircle size={16} /> Promote
                      </button>
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
