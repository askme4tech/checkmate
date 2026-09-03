import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { apiClient } from '../api/client';

export const ConceptualMastery = () => {
  const [concept, setConcept] = useState('openings'); // maps to db.Assessment.openings
  const [students, setStudents] = useState([]);
  const [assessments, setAssessments] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient('/students')
      .then(data => {
        setStudents(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleScoreChange = (studentId, score) => {
    setAssessments(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [concept]: parseInt(score, 10)
      }
    }));
  };

  const saveAllAssessments = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(assessments).map(([studentId, scores]) => {
        const payload = {
          date: new Date().toISOString().split('T')[0],
          student_id: parseInt(studentId, 10),
          tactics: scores.tactics || 0,
          openings: scores.openings || 0,
          endgames: scores.endgames || 0,
          calculation: scores.calculation || 0,
          strategy: scores.strategy || 0,
          ...scores
        };
        return apiClient(`/students/${studentId}/assessments`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      });
      await Promise.all(promises);
      alert('Assessments saved successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save assessments.');
    } finally {
      setSaving(false);
    }
  };

  const getTopicData = () => {
    let high = 0, mod = 0, low = 0;
    Object.values(assessments).forEach(scores => {
      const s = scores[concept];
      if (s >= 8) high++;
      else if (s >= 5) mod++;
      else if (s > 0) low++;
    });
    if (high===0 && mod===0 && low===0) return [{name:'No Data', value:1}];
    return [
      { name: 'High Mastery', value: high },
      { name: 'Moderate Mastery', value: mod },
      { name: 'Low Mastery', value: low },
    ];
  };

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#94a3b8'];
  const chartData = getTopicData();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px', color: 'var(--text-main)' }}>Conceptual Mastery</h1>
          <p style={{ color: 'var(--text-muted)' }}>Enter and track student understanding of core chess concepts.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select 
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            style={{ padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', minWidth: '200px' }}
          >
            <option value="openings">Openings</option>
            <option value="endgames">Endgames</option>
            <option value="tactics">Tactics</option>
            <option value="calculation">Calculation</option>
            <option value="strategy">Strategy</option>
          </select>
          <button className="btn btn-primary" onClick={saveAllAssessments} disabled={saving || Object.keys(assessments).length === 0}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save All Assessments'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
            <h3 style={{ color: 'var(--text-main)' }}>Rapid Evaluation Table - {concept}</h3>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Student</th>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Current Level</th>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Mastery Score (0-10)</th>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading students...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No students found.
                    </td>
                  </tr>
                ) : (
                  students.map(s => {
                    const level = s.level || 'Beginner';
                    const score = assessments[s.id]?.[concept] || '';
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 20px', color: 'var(--text-main)', fontWeight: 500 }}>{s.name}</td>
                        <td style={{ padding: '12px 20px', color: 'var(--text-muted)' }}>{level}</td>
                        <td style={{ padding: '12px 20px' }}>
                          <input 
                            type="number" 
                            min="0" 
                            max="10" 
                            value={score}
                            onChange={(e) => handleScoreChange(s.id, e.target.value)}
                            placeholder="0-10"
                            style={{ padding: '8px', width: '80px', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-card)', color: 'white' }}
                          />
                        </td>
                        <td style={{ padding: '12px 20px', color: 'var(--text-muted)' }}>Today</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '24px', color: 'var(--text-main)' }}>Topic Mastery Distribution</h3>
          <div style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: 'auto', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '50%' }}></div> High
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '50%' }}></div> Moderate
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%' }}></div> Low
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
