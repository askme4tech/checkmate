import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { apiClient } from '../api/client';

export const Coaches = () => {
  const [coaches, setCoaches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });

  const fetchCoaches = async () => {
    try {
      const data = await apiClient('/coaches');
      setCoaches(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCoaches();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiClient('/coaches', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setShowModal(false);
      setFormData({ name: '', email: '' });
      fetchCoaches();
    } catch (err) {
      console.error(err);
      alert('Error creating coach');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Staff & Coaches</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Coach
        </button>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)' }}>ID</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)' }}>Name</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)' }}>Email</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)' }}>Role</th>
            </tr>
          </thead>
          <tbody>
            {coaches.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '16px 24px' }}>#{c.id}</td>
                <td style={{ padding: '16px 24px', fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: '16px 24px' }}>{c.email}</td>
                <td style={{ padding: '16px 24px' }}>
                  <span className="badge badge-success">{c.role || 'Coach'}</span>
                </td>
              </tr>
            ))}
            {coaches.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No coaches found. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '8px', width: '400px', border: '1px solid var(--border-color)' }}>
            <h2 style={{ marginTop: 0 }}>Add New Coach</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Name</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Email</label>
                <input 
                  type="email" 
                  required 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }} 
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Coach</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
