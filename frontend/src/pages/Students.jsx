import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Download, Search, Edit, Trash2, CheckCircle, CreditCard, ChevronDown, UserPlus } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const Students = () => {
  const { isReader } = useAuth();
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Active');
  
  const initialFormState = { 
    name: '', dob: '', joining_date: new Date().toISOString().split('T')[0], 
    gender: 'Male', education: 'School', t_shirt_size: 'XS', 
    fide_id: 'No', fide_rating: '', level: 'BEGINNER', 
    experience_category: 'New to Chess', learning_goal: '', 
    batch_ids: [], batch_schedule_ids: [],
    father_name: '', mother_name: '', primary_contact: '', 
    whatsapp_number: '', same_as_primary: false, address: '' 
  };
  
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchStudents();
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await apiClient('/batches');
      setBatches(res);
    } catch (error) {
      console.error("Error fetching batches:", error);
    }
  };


  const fetchStudents = async () => {
    try {
      // In development without backend running, we could use mock data, 
      // but let's connect to the real API (assuming it's on localhost:8000)
      const res = await apiClient('/students');
      setStudents(res);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching students:", error);
      // For testing UI if backend is not cors enabled or reachable:
      setStudents([
        { id: 1, name: 'HARI RAM', notes: 'New to Chess', level: 'INTERMEDIATE', status: 'Active', balance: 0 },
        { id: 2, name: 'ZARAH SHERIN', notes: 'New to Chess', level: 'BEGINNER', status: 'Active', balance: 0 },
        { id: 3, name: 'YOGESHWARAN', notes: 'New to Chess', level: 'BEGINNER', status: 'Active', balance: -500 },
      ]);
      setLoading(false);
    }
  };

  
  
  const handleToggle = async (id) => {
    try {
      await apiClient(`/students/${id}/toggle_status`, { method: 'PATCH' });
      fetchStudents();
    } catch (err) {
      alert("Error updating student");
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} student(s)?`)) return;
    try {
      for (const id of selectedIds) {
        await apiClient(`/students/${id}`, { method: 'DELETE' });
      }
      setSelectedIds(new Set());
      fetchStudents();
    } catch (err) {
      alert("Error deleting students");
    }
  };

  const handleEdit = async (student) => {
    try {
      const fullStudent = await apiClient(`/students/${student.id}`);
      setFormData({
        ...initialFormState,
        id: student.id,
        ...fullStudent,
        joining_date: fullStudent.joining_date || initialFormState.joining_date,
        batch_ids: fullStudent.batch_ids || [],
        batch_schedule_ids: fullStudent.batch_schedule_ids || []
      });
      setShowModal(true);
    } catch (err) {
      alert("Error fetching student details");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        dob: formData.dob || null,
        joining_date: formData.joining_date || null,
        gender: formData.gender,
        education: formData.education,
        t_shirt_size: formData.t_shirt_size,
        fide_id: formData.fide_id === 'Yes' ? 'Pending' : formData.fide_id,
        fide_rating: formData.fide_rating ? parseInt(formData.fide_rating) : null,
        experience_category: formData.experience_category,
        learning_goal: formData.learning_goal,
        level: formData.level,
        batch_ids: formData.batch_ids.length > 0 ? [parseInt(formData.batch_ids[0])] : [],
        batch_schedule_ids: formData.batch_schedule_ids.length > 0 ? formData.batch_schedule_ids.map(id => parseInt(id)) : [],
        contact: {
          father_name: formData.father_name,
          mother_name: formData.mother_name,
          primary_contact: formData.primary_contact,
          whatsapp_number: formData.same_as_primary ? formData.primary_contact : formData.whatsapp_number,
          address: formData.address
        }
      };

      if (formData.id) {
        await apiClient(`/students/${formData.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiClient('/students', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowModal(false);
      setFormData(initialFormState);
      fetchStudents();
    } catch (err) {
      console.error(err);
      alert("Error saving student. Please check all required fields.");
    }
  };

  const handleScheduleToggle = (scheduleId) => {
    setFormData(prev => {
      const ids = new Set(prev.batch_schedule_ids);
      if (ids.has(scheduleId)) {
        ids.delete(scheduleId);
      } else {
        ids.add(scheduleId);
      }
      return { ...prev, batch_schedule_ids: Array.from(ids) };
    });
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)));
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
    // Export selected to CSV
    const toExport = students.filter(s => selectedIds.has(s.id));
    if (toExport.length === 0) return;

    const headers = ['ID', 'Name', 'Level', 'Status', 'Balance'];
    const rows = toExport.map(s => [s.id, s.name, s.level, s.status, s.balance]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "students_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) && (s.status || 'Active') === statusFilter
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className={`btn ${statusFilter === 'Active' ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => setStatusFilter('Active')}>Active</button>
          <button className={`btn ${statusFilter === 'Inactive' ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => setStatusFilter('Inactive')}>Inactive</button>
        </div>
        {!isReader && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <UserPlus size={18} /> New Registration
          </button>
        )}
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && !isReader && (
        <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
          <span style={{ fontWeight: 600, color: '#60a5fa' }}>{selectedIds.size} student(s) selected</span>
          <div style={{ display: 'flex', gap: '12px' }}>
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
              placeholder="Search by name..." 
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
                  checked={filteredStudents.length > 0 && selectedIds.size === filteredStudents.length}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th>Name</th>
              <th>Level</th>
              <th>Status</th>
              <th>Fee Status</th>
              {!isReader && <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px' }}>Loading students...</td></tr>
            ) : filteredStudents.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px' }}>No students found.</td></tr>
            ) : (
              filteredStudents.map(student => (
                <tr key={student.id} style={{ backgroundColor: selectedIds.has(student.id) ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(student.id)} 
                      onChange={() => toggleSelect(student.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{student.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{student.notes || 'No notes'}</div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{student.level}</span>
                  </td>
                  <td>
                    <span className={`badge ${student.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                      {student.status}
                    </span>
                  </td>
                  <td>
                    {student.balance >= 0 ? (
                      <span className="badge badge-success">PAID</span>
                    ) : (
                      <span className="badge badge-warning">DUE ({Math.abs(student.balance)})</span>
                    )}
                  </td>
                  {!isReader && (
                    <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Link to={`/finance?studentId=${student.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CreditCard size={14} /> Pay
                        </Link>
                        <button className="btn-icon" onClick={() => handleEdit(student)}><Edit size={16} /></button>
                        <button className="btn-icon" style={{ color: '#f87171' }} onClick={() => handleToggle(student.id)}><Trash2 size={16} /></button>
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
          <div className="glass-panel" style={{ width: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '0' }}>
            
            <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
              <h2 style={{ margin: 0, color: 'var(--text-main)' }}>{formData.id ? 'Edit Student' : 'New Student Registration'}</h2>
              <button className="btn-icon" onClick={() => {setShowModal(false); setFormData(initialFormState);}}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* Personal Details */}
              <div>
                <h3 style={{ color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>Personal Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Full Name *</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Date of Birth</label>
                    <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Joining Date</label>
                    <input type="date" value={formData.joining_date} onChange={e => setFormData({...formData, joining_date: e.target.value})} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Gender</label>
                    <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Education / Occupation</label>
                    <select value={formData.education} onChange={e => setFormData({...formData, education: e.target.value})} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}>
                      <option value="School">School</option>
                      <option value="College">College</option>
                      <option value="Working">Working</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>T-Shirt Size</label>
                    <select value={formData.t_shirt_size} onChange={e => setFormData({...formData, t_shirt_size: e.target.value})} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}>
                      <option value="XS">XS</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Chess Profile */}
              <div>
                <h3 style={{ color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>Chess Profile</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Has FIDE ID?</label>
                    <select value={formData.fide_id} onChange={e => setFormData({...formData, fide_id: e.target.value})} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}>
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>FIDE Rating</label>
                    <input type="number" value={formData.fide_rating} onChange={e => setFormData({...formData, fide_rating: e.target.value})} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }} disabled={formData.fide_id === 'No'} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Current Level</label>
                    <select value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}>
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Experience Category</label>
                    <select value={formData.experience_category} onChange={e => setFormData({...formData, experience_category: e.target.value})} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}>
                      <option value="New to Chess">New to Chess</option>
                      <option value="Played casually">Played casually</option>
                      <option value="Tournament player">Tournament player</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Learning Goals</label>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', height: '100%' }}>
                      {['Hobby', 'Competitive', 'State Level', 'National', 'FIDE Rating'].map(goal => (
                        <label key={goal} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                          <input type="radio" name="learning_goal" checked={formData.learning_goal === goal} onChange={() => setFormData({...formData, learning_goal: goal})} /> {goal}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Batch Selection */}
              <div>
                <h3 style={{ color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>Batch Selection</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Assign to Batch *</label>
                    <select required value={formData.batch_ids[0] || ''} onChange={e => {
                      setFormData({...formData, batch_ids: [e.target.value], batch_schedule_ids: []});
                    }} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}>
                      <option value="" disabled>Select a batch...</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>{b.name} - {b.timing}</option>
                      ))}
                    </select>
                  </div>
                  
                  {formData.batch_ids.length > 0 && formData.batch_ids[0] && (() => {
                    const selectedBatch = batches.find(b => b.id.toString() === formData.batch_ids[0].toString());
                    if (!selectedBatch || !selectedBatch.schedules) return null;
                    const dayMap = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"};
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Select Specific Sessions (Optional - defaults to all if none selected)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                          {selectedBatch.schedules.map(sch => (
                            <label key={sch.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: formData.batch_schedule_ids.includes(sch.id) ? 'rgba(59, 130, 246, 0.2)' : 'transparent', padding: '8px 12px', borderRadius: '4px', border: formData.batch_schedule_ids.includes(sch.id) ? '1px solid #3b82f6' : '1px solid var(--border-color)' }}>
                              <input 
                                type="checkbox" 
                                checked={formData.batch_schedule_ids.includes(sch.id)}
                                onChange={() => handleScheduleToggle(sch.id)}
                              />
                              <span style={{ fontSize: '0.9rem' }}>{dayMap[sch.day]} {sch.start} - {sch.end}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Parent / Contact */}
              <div>
                <h3 style={{ color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>Parent / Contact</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Father's Name</label>
                    <input type="text" value={formData.father_name} onChange={e => setFormData({...formData, father_name: e.target.value})} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Mother's Name</label>
                    <input type="text" value={formData.mother_name} onChange={e => setFormData({...formData, mother_name: e.target.value})} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Primary Contact *</label>
                    <input type="tel" required value={formData.primary_contact} onChange={e => setFormData({...formData, primary_contact: e.target.value})} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>WhatsApp Number</label>
                      <label style={{ color: '#3b82f6', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input type="checkbox" checked={formData.same_as_primary} onChange={e => setFormData({...formData, same_as_primary: e.target.checked})} /> Same as Primary
                      </label>
                    </div>
                    <input type="tel" disabled={formData.same_as_primary} value={formData.same_as_primary ? formData.primary_contact : formData.whatsapp_number} onChange={e => setFormData({...formData, whatsapp_number: e.target.value})} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: formData.same_as_primary ? 'var(--text-muted)' : 'white', borderRadius: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Address *</label>
                    <input type="text" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }} />
                  </div>
                </div>
              </div>

              <div style={{ position: 'sticky', bottom: '-24px', background: 'var(--bg-card)', padding: '16px 0', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '1.1rem', fontWeight: 600 }}>{formData.id ? 'Save Changes' : 'Register Student'}</button>
              </div>

            </form>
          </div>
        </div>
      )}
        </div>
  );
};
