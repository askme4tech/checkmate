import React, { useState, useEffect } from 'react';
import { Download, Search, Edit, Trash2, PlusCircle, MessageSquare, Target, Users, TrendingUp } from 'lucide-react';
import { apiClient } from '../api/client';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export const CRM = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const initialFormState = { date: new Date().toISOString().split('T')[0], parent_name: '', student_name: '', contact: '', source: 'Website', status: 'Open', notes: '' };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      const data = await apiClient('/enquiries');
      setEnquiries(data);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiClient(`/enquiries/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await apiClient('/enquiries', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setShowModal(false);
      setEditingId(null);
      setFormData(initialFormState);
      fetchEnquiries();
    } catch (err) {
      alert("Error saving enquiry");
    }
  };

  const handleEdit = (enq) => {
    setFormData({
      date: enq.date,
      parent_name: enq.parent_name,
      student_name: enq.student_name,
      contact: enq.contact,
      source: enq.source,
      status: enq.status,
      notes: enq.notes
    });
    setEditingId(enq.id);
    setShowModal(true);
  };

  const handleMessage = (contact) => {
    if (contact.includes('@')) {
      window.location.href = `mailto:${contact}`;
    } else {
      window.location.href = `tel:${contact}`;
    }
  };

  const filtered = enquiries.filter(e => 
    e.parent_name.toLowerCase().includes(search.toLowerCase()) || 
    e.student_name.toLowerCase().includes(search.toLowerCase())
  );

  // Enquiry Analysis Computations
  const totalEnquiries = enquiries.length;
  const openEnquiries = enquiries.filter(e => e.status === 'Open' || e.status === 'In Progress').length;
  const convertedEnquiries = enquiries.filter(e => e.status === 'Converted' || e.status === 'Closed').length;
  const conversionRate = totalEnquiries > 0 ? Math.round((convertedEnquiries / totalEnquiries) * 100) : 0;

  const sourceCounts = enquiries.reduce((acc, curr) => {
    acc[curr.source] = (acc[curr.source] || 0) + 1;
    return acc;
  }, {});
  
  const sourceData = Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];


  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px', color: 'var(--text-main)' }}>CRM & Enquiries</h1>
          <p style={{ color: 'var(--text-muted)' }}>Track prospective students and analyze lead conversion.</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setFormData(initialFormState);
          setEditingId(null);
          setShowModal(true);
        }}>
          <PlusCircle size={18} /> New Enquiry
        </button>
      </div>

      {/* Enquiry Analysis Section */}
      <h3 style={{ color: 'var(--text-main)', marginTop: '8px', marginBottom: '-8px' }}>Enquiry Analysis</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        
        {/* KPIs */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: '#3b82f6' }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Total Leads</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{totalEnquiries}</div>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: '#f59e0b' }}>
              <Target size={24} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Active/Open</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{openEnquiries}</div>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: '#10b981' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Conversion Rate</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{conversionRate}%</div>
            </div>
          </div>
        </div>

        {/* Source Distribution Chart */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '140px', padding: '16px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '8px' }}>Lead Sources</div>
          <div style={{ flex: 1, position: 'relative' }}>
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value" stroke="none">
                    {sourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data</div>
            )}
          </div>
        </div>

      </div>

      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--glass-border)' }}>
          <div className="search-bar" style={{ width: '300px' }}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search leads..." 
              style={{ width: '100%', paddingLeft: '36px', background: 'rgba(0,0,0,0.2)' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table style={{ width: '100%', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
              <th style={{ padding: '16px 24px' }}>Date</th>
              <th>Parent / Contact</th>
              <th>Student</th>
              <th>Source</th>
              <th>Status</th>
              <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px' }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px' }}>No enquiries found.</td></tr>
            ) : (
              filtered.map(enq => (
                <tr key={enq.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px 24px', color: 'var(--text-muted)' }}>{enq.date}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{enq.parent_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{enq.contact}</div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{enq.student_name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{enq.source}</td>
                  <td>
                    <span className={`badge ${enq.status === 'Closed' ? 'badge-success' : 'badge-warning'}`}>
                      {enq.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                    <button className="btn-icon" onClick={() => handleMessage(enq.contact)}><MessageSquare size={16} /></button>
                    <button className="btn-icon" onClick={() => handleEdit(enq)}><Edit size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '8px', width: '350px', border: '1px solid var(--border-color)' }}>
            <h2 style={{ marginTop: 0 }}>{editingId ? 'Edit Enquiry' : 'New Enquiry'}</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="Parent Name" required value={formData.parent_name} onChange={e => setFormData({...formData, parent_name: e.target.value})} style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }} />
              <input type="text" placeholder="Student Name" required value={formData.student_name} onChange={e => setFormData({...formData, student_name: e.target.value})} style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }} />
              <input type="text" placeholder="Contact Details" required value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }} />
              <select required value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }}>
                <option value="Website">Website</option>
                <option value="Referral">Referral</option>
                <option value="Walk-in">Walk-in</option>
              </select>
              <textarea placeholder="Notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }} />
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                  setFormData(initialFormState);
                }} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Enquiry</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
