import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Search, Edit, Trash2, Users, Copy } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const Batches = () => {
  const { isReader } = useAuth();
  const [batches, setBatches] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [bulkCoachId, setBulkCoachId] = useState('');
  
  const initialFormState = {
    name: '',
    schedules: [
      { day_of_week: 1, start_time: '17:00', end_time: '18:00', coach_id: '' }
    ]
  };
  
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);

  // Map numbers to days
  const dayOptions = [
    { value: 0, label: 'Monday' },
    { value: 1, label: 'Tuesday' },
    { value: 2, label: 'Wednesday' },
    { value: 3, label: 'Thursday' },
    { value: 4, label: 'Friday' },
    { value: 5, label: 'Saturday' },
    { value: 6, label: 'Sunday' }
  ];
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Parse coach_id to int if present
      const payload = {
        name: formData.name,
        schedules: formData.schedules.map(s => ({
          day_of_week: parseInt(s.day_of_week),
          start_time: s.start_time,
          end_time: s.end_time,
          coach_id: s.coach_id ? parseInt(s.coach_id) : null
        }))
      };

      if (editingId) {
        await apiClient(`/batches/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiClient('/batches', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      
      setShowModal(false);
      setFormData(initialFormState);
      setEditingId(null);
      fetchBatches();
    } catch (err) {
      console.error(err);
      alert("Error saving batch");
    }
  };

  const handleEdit = (batch) => {
    setFormData({
      name: batch.name,
      schedules: batch.schedules.length > 0 ? batch.schedules.map(s => ({
        day_of_week: s.day,
        start_time: s.start,
        end_time: s.end,
        coach_id: s.coach || ''
      })) : [{ day_of_week: 1, start_time: '17:00', end_time: '18:00', coach_id: '' }]
    });
    setEditingId(batch.id);
    setShowModal(true);
  };

  const handleCopy = (batch) => {
    setFormData({
      name: `Copy of ${batch.name}`,
      schedules: batch.schedules.length > 0 ? batch.schedules.map(s => ({
        day_of_week: s.day,
        start_time: s.start,
        end_time: s.end,
        coach_id: s.coach || ''
      })) : [{ day_of_week: 1, start_time: '17:00', end_time: '18:00', coach_id: '' }]
    });
    setEditingId(null);
    setShowModal(true);
  };

  const handleBulkAssignCoach = async () => {
    if (!bulkCoachId) return alert("Please select a coach");
    try {
      await apiClient('/batches/bulk-assign-coach', {
        method: 'PUT',
        body: JSON.stringify({
          batch_ids: Array.from(selectedIds),
          coach_id: parseInt(bulkCoachId)
        })
      });
      setShowCoachModal(false);
      setBulkCoachId('');
      setSelectedIds(new Set());
      fetchBatches();
    } catch (err) {
      alert("Error assigning coaches");
    }
  };

  const addSchedule = () => {
    setFormData({
      ...formData,
      schedules: [...formData.schedules, { day_of_week: 1, start_time: '17:00', end_time: '18:00', coach_id: '' }]
    });
  };

  const removeSchedule = (index) => {
    const updated = [...formData.schedules];
    updated.splice(index, 1);
    setFormData({ ...formData, schedules: updated });
  };

  const updateSchedule = (index, field, value) => {
    const updated = [...formData.schedules];
    updated[index][field] = value;
    setFormData({ ...formData, schedules: updated });
  };

  const handleToggle = async (id) => {
    try {
      await apiClient(`/batches/${id}/toggle`, { method: 'PATCH' });
      fetchBatches();
    } catch (err) {
      alert("Error toggling batch");
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} batch(es)?`)) return;
    try {
      for (const id of selectedIds) {
        await apiClient(`/batches/${id}`, { method: 'DELETE' });
      }
      setSelectedIds(new Set());
      fetchBatches();
    } catch (err) {
      alert("Error deleting batches");
    }
  };

  const fetchCoaches = async () => {
    try {
      const data = await apiClient('/coaches');
      setCoaches(data);
    } catch (err) {
      console.error("Error fetching coaches", err);
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchCoaches();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await apiClient('/batches');
      setBatches(res);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching batches:", error);
      setBatches([]);
      setLoading(false);
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredBatches.map(b => b.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleExport = () => {
    const toExport = batches.filter(b => selectedIds.has(b.id));
    if (toExport.length === 0) return;

    const headers = ['ID', 'Batch Name', 'Timing'];
    const rows = toExport.map(b => [b.id, b.name, b.timing]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(r => r.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "batches_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredBatches = batches.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'active' ? b.is_active : !b.is_active;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className={`btn ${filterStatus === 'active' ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => setFilterStatus('active')}>Active</button>
          <button className={`btn ${filterStatus === 'archived' ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => setFilterStatus('archived')}>Archived</button>
        </div>
        {!isReader && (
          <button className="btn btn-primary" onClick={() => {
            setEditingId(null);
            setFormData(initialFormState);
            setShowModal(true);
          }}>
            <Users size={18} /> Create Batch
          </button>
        )}
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && !isReader && (
        <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
          <span style={{ fontWeight: 600, color: '#60a5fa' }}>{selectedIds.size} batch(es) selected</span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={() => setShowCoachModal(true)} style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}>
              <Users size={16} /> Assign Coach
            </button>
            <button className="btn btn-secondary" onClick={handleExport}>
              <Download size={16} /> Export CSV
            </button>
            <button className="btn btn-secondary" style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }} onClick={handleDeleteSelected}>
              <Trash2 size={16} /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Table Panel */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
          <div className="search-bar" style={{ width: '300px' }}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search batches..." 
              style={{ width: '100%', paddingLeft: '36px', background: 'rgba(0,0,0,0.2)' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table style={{ width: '100%', textAlign: 'left' }}>
          <thead>
            <tr>
              <th style={{ width: '50px', textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  onChange={toggleSelectAll} 
                  checked={filteredBatches.length > 0 && selectedIds.size === filteredBatches.length}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th>Batch Name</th>
              <th>Coach ID</th>
              <th>Timing</th>
              {!isReader && <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '32px' }}>Loading batches...</td></tr>
            ) : filteredBatches.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '32px' }}>No batches found.</td></tr>
            ) : (
              filteredBatches.map(b => (
                <tr key={b.id} style={{ backgroundColor: selectedIds.has(b.id) ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(b.id)} 
                      onChange={() => toggleSelect(b.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{b.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.days}</div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">
                      {b.schedules && b.schedules.length > 0 && b.schedules[0].coach ? `Coach #${b.schedules[0].coach}` : 'Unassigned'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{b.timing}</span>
                  </td>
                  {!isReader && (
                    <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn-icon" title="Duplicate Batch" onClick={() => handleCopy(b)}><Copy size={16} /></button>
                        <button className="btn-icon" title="Edit Batch" onClick={() => handleEdit(b)}><Edit size={16} /></button>
                        <button className="btn-icon" title="Delete Batch" style={{ color: '#f87171' }} onClick={() => handleToggle(b.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '8px', width: '500px', border: '1px solid var(--border-color)', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0 }}>{editingId ? 'Edit Batch' : 'Create Batch'}</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Batch Name *</label>
                <input type="text" placeholder="e.g. Weekend Beginners" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Schedules</label>
                  <button type="button" onClick={addSchedule} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.85rem' }}>+ Add Day</button>
                </div>
                
                {formData.schedules.map((schedule, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <select 
                      value={schedule.day_of_week} 
                      onChange={e => updateSchedule(idx, 'day_of_week', e.target.value)} 
                      style={{ flex: 1, padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }}
                    >
                      {dayOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                    
                    <input 
                      type="time" 
                      value={schedule.start_time} 
                      onChange={e => updateSchedule(idx, 'start_time', e.target.value)} 
                      style={{ width: '100px', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }} 
                    />
                    
                    <input 
                      type="time" 
                      value={schedule.end_time} 
                      onChange={e => updateSchedule(idx, 'end_time', e.target.value)} 
                      style={{ width: '100px', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }} 
                    />

                    <select
                      value={schedule.coach_id || ''}
                      onChange={e => updateSchedule(idx, 'coach_id', e.target.value)}
                      style={{ flex: 1, padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }}
                    >
                      <option value="">Select Coach</option>
                      {coaches.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>

                    {formData.schedules.length > 1 && (
                      <button type="button" onClick={() => removeSchedule(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                  setFormData(initialFormState);
                }} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Batch</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showCoachModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '8px', width: '400px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginTop: 0 }}>Assign Coach to {selectedIds.size} Batch(es)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <select
                value={bulkCoachId}
                onChange={e => setBulkCoachId(e.target.value)}
                style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }}
              >
                <option value="">Select Coach</option>
                {coaches.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCoachModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="button" onClick={handleBulkAssignCoach} className="btn btn-primary">Assign</button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
  );
};
