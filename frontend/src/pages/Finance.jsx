import React, { useState, useEffect } from 'react';
import { Download, Search, Edit, Trash2, Receipt } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';

export const Finance = () => {
  const [ledgers, setLedgers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ledgers'); // 'ledgers' or 'balances'
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ student_id: '', amount: '', classes_credited: 12, payment_mode: 'Cash', payment_date: new Date().toISOString().split('T')[0] });
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const studentId = searchParams.get('studentId');
    if (studentId) {
      setFormData(prev => ({ ...prev, student_id: studentId }));
      setShowModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchLedgers();
    fetchStudents();
  }, []);

  const fetchLedgers = async () => {
    try {
      const res = await apiClient('/fees');
      setLedgers(res);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching ledgers:", error);
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await apiClient('/students');
      setStudents(res);
    } catch (error) { console.error("Error fetching students:", error); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiClient(`/students/${formData.student_id}/fees`, {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          classes_credited: parseInt(formData.classes_credited),
          payment_mode: formData.payment_mode,
          payment_date: formData.payment_date
        })
      });
      setShowModal(false);
      setFormData({ student_id: '', amount: '', classes_credited: 12, payment_mode: 'Cash', payment_date: new Date().toISOString().split('T')[0] });
      fetchLedgers();
    } catch (err) {
      alert("Error recording payment");
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredLedgers.map(l => l.id)));
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
    const toExport = ledgers.filter(l => selectedIds.has(l.id));
    if (toExport.length === 0) return;

    const headers = ['ID', 'Student ID', 'Amount', 'Classes Credited', 'Date'];
    const rows = toExport.map(l => [l.id, l.student_id, l.amount, l.classes_credited, l.date]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(r => r.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "finance_ledgers_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLedgers = ledgers.filter(l => 
    l.id.toString().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className={`btn ${activeTab === 'ledgers' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('ledgers')}>All Entries</button>
          <button className={`btn ${activeTab === 'balances' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('balances')}>Balances</button>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Receipt size={18} /> Record Payment
        </button>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
          <span style={{ fontWeight: 600, color: '#60a5fa' }}>{selectedIds.size} record(s) selected</span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={handleExport}>
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>
      )}

      {/* Table Panel */}
      {activeTab === 'ledgers' && (
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
          <div className="search-bar" style={{ width: '300px' }}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search ID..." 
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
                  checked={filteredLedgers.length > 0 && selectedIds.size === filteredLedgers.length}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th>Date</th>
              <th>Student</th>
              <th>Classes Credited</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '32px' }}>Loading ledgers...</td></tr>
            ) : filteredLedgers.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '32px' }}>No records found.</td></tr>
            ) : (
              filteredLedgers.map(l => (
                <tr key={l.id} style={{ backgroundColor: selectedIds.has(l.id) ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(l.id)} 
                      onChange={() => toggleSelect(l.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{l.date}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{l.student_name || `Student #${l.student_id}`}</div>
                  </td>
                  <td>
                    <span className="badge badge-success">
                      +{l.classes_credited}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#34d399' }}>
                      +{l.amount}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {activeTab === 'balances' && (
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
            <div className="search-bar" style={{ width: '300px' }}>
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search Student..." 
                style={{ width: '100%', paddingLeft: '36px', background: 'rgba(0,0,0,0.2)' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <table style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Student Name</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Classes Remaining</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px 20px', color: 'white' }}>{s.name}</td>
                  <td style={{ padding: '16px 20px', color: 'white' }}>
                    <span className={`badge ${s.classes_remaining > 2 ? 'badge-success' : s.classes_remaining > 0 ? 'badge-warning' : 'badge-error'}`}>
                      {s.classes_remaining} Classes
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'white' }}>
                    {s.classes_remaining <= 0 ? (
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>Needs Renewal</span>
                    ) : (
                      <span style={{ color: '#10b981' }}>Active</span>
                    )}
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan="3" style={{ padding: '40px 20px', textAlign: 'center' }}>No students found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '8px', width: '350px', border: '1px solid var(--border-color)' }}>
            <h2 style={{ marginTop: 0 }}>Record Payment</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select required value={formData.student_id} onChange={e => setFormData({...formData, student_id: e.target.value})} style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }}>
                <option value="">Select Student...</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} (ID: {s.id})</option>
                ))}
              </select>
              <input type="number" placeholder="Amount (e.g. 1500)" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }} />
              <input type="number" placeholder="Classes Credited" required value={formData.classes_credited} onChange={e => setFormData({...formData, classes_credited: e.target.value})} style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }} />
              <select required value={formData.payment_mode} onChange={e => setFormData({...formData, payment_mode: e.target.value})} style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }}>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
              <input type="date" required value={formData.payment_date} onChange={e => setFormData({...formData, payment_date: e.target.value})} style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }} />
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
