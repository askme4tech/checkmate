import React, { useState, useEffect } from 'react';
import { Trophy, Users, PlusCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient } from '../api/client';

export const Tournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', date: new Date().toISOString().split('T')[0], status: 'Upcoming' });

  const fetchTournaments = () => {
    setLoading(true);
    apiClient('/tournaments')
      .then(data => {
        setTournaments(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiClient('/tournaments', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setShowModal(false);
      fetchTournaments();
    } catch (err) {
      alert("Error creating tournament");
    }
  };


  const chartData = tournaments.map(t => ({
    name: t.name.substring(0, 10) + '...',
    participants: t.participations ? t.participations.length : 0 // mock for empty db
  })).slice(0, 6);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px', color: 'var(--text-main)' }}>Academy Tournaments</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage tournament participation and performance tracking.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <PlusCircle size={16} /> New Tournament
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Date</th>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Tournament Name</th>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Participants</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading tournaments...
                    </td>
                  </tr>
                ) : tournaments.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No tournaments recorded.
                    </td>
                  </tr>
                ) : (
                  tournaments.map((t) => {
                    const count = t.participations ? t.participations.length : 0;
                    const isUpcoming = new Date(t.date) > new Date();
                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '16px 20px', color: 'var(--text-main)' }}>{t.date}</td>
                        <td style={{ padding: '16px 20px', color: 'var(--text-main)', fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Trophy size={16} color="#f59e0b" /> {t.name}
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--text-main)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Users size={14} color="var(--text-muted)" /> {count}
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <span style={{ 
                            padding: '4px 10px', 
                            fontSize: '0.8rem', 
                            fontWeight: 600, 
                            borderRadius: '4px',
                            background: isUpcoming ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: isUpcoming ? '#3b82f6' : '#10b981'
                          }}>
                            {isUpcoming ? 'Upcoming' : 'Completed'}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '24px', color: 'var(--text-main)' }}>Participation History</h3>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{fill: 'var(--text-muted)', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} />
                <Bar dataKey="participants" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '8px', width: '400px', border: '1px solid var(--border-color)' }}>
            <h2 style={{ marginTop: 0 }}>Record Tournament</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tournament Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }}>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Completed">Completed</option>
                  <option value="Ongoing">Ongoing</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Tournament</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
