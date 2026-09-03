import React, { useState, useEffect } from 'react';
import { Download, Search, ChevronDown, Check, X } from 'lucide-react';
import { apiClient } from '../api/client';

export const Attendance = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [history, setHistory] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceState, setAttendanceState] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    fetchBatches();
    fetchHistory();
  }, []);

  const fetchBatches = async () => {
    try {
      const data = await apiClient('/batches');
      setBatches(data);
    } catch (e) { console.error(e); }
  };

  const fetchHistory = async () => {
    try {
      const data = await apiClient('/attendance/summary');
      setHistory(data);
      setLoading(false);
    } catch (e) { setLoading(false); }
  };

  const handleFetchStudents = async () => {
    if (!selectedBatch) return alert("Select a batch");
    try {
      const data = await apiClient(`/students?batch_id=${selectedBatch}`);
      
      let filteredData = data;
      if (selectedSchedule) {
        const schId = parseInt(selectedSchedule);
        filteredData = data.filter(s => 
          !s.batch_schedule_ids || 
          s.batch_schedule_ids.length === 0 || 
          s.batch_schedule_ids.includes(schId)
        );
      }

      setStudents(filteredData);
      // Initialize all to Present by default
      const initialState = {};
      filteredData.forEach(s => initialState[s.id] = 'Present');
      setAttendanceState(initialState);
    } catch (e) {
      alert("Error fetching students");
    }
  };

  const handleSaveAttendance = async () => {
    try {
      const promises = students.map(s => 
        apiClient('/attendance', {
          method: 'POST',
          body: JSON.stringify({
            student_id: s.id,
            batch_id: parseInt(selectedBatch),
            batch_schedule_id: selectedSchedule ? parseInt(selectedSchedule) : null,
            status: attendanceState[s.id],
            date: date
          })
        })
      );
      await Promise.all(promises);
      alert("Attendance Saved!");
      setStudents([]);
      fetchHistory();
    } catch (e) {
      alert("Error saving attendance");
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px', color: 'var(--text-main)' }}>Batch Attendance</h1>
          <p style={{ color: 'var(--text-muted)' }}>Mark attendance and review history by date.</p>
        </div>
      </div>

      <div className="glass-panel">
        <h3 style={{ marginBottom: '16px', color: 'var(--text-main)', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>Mark Today's Attendance</h3>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} />
          </div>
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Batch</label>
            <select value={selectedBatch} onChange={(e) => { setSelectedBatch(e.target.value); setSelectedSchedule(''); }} style={{ padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}>
              <option value="">Select Batch...</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          
          {selectedBatch && (
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Schedule (Optional)</label>
              <select value={selectedSchedule} onChange={(e) => setSelectedSchedule(e.target.value)} style={{ padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}>
                <option value="">All Schedules</option>
                {batches.find(b => b.id.toString() === selectedBatch)?.schedules.map(sch => (
                  <option key={sch.id} value={sch.id}>
                    {{0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}[sch.day]} {sch.start} - {sch.end}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <button className="btn btn-primary" onClick={handleFetchStudents} style={{ padding: '10px 24px' }}>Fetch Students</button>
        </div>
      </div>

      {students.length > 0 && (
        <div className="glass-panel">
          <h3 style={{ marginBottom: '16px', color: 'var(--text-main)' }}>Students List</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ textAlign: 'left', padding: '12px' }}>Name</th>
                <th style={{ textAlign: 'center', padding: '12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', color: 'white' }}>{s.name}</td>
                  <td style={{ padding: '12px', textAlign: 'center', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button 
                      onClick={() => setAttendanceState({...attendanceState, [s.id]: 'Present'})}
                      style={{ padding: '6px 12px', borderRadius: '4px', background: attendanceState[s.id] === 'Present' ? '#10b981' : 'transparent', border: '1px solid #10b981', color: attendanceState[s.id] === 'Present' ? 'white' : '#10b981', cursor: 'pointer' }}>
                      <Check size={16} /> Present
                    </button>
                    <button 
                      onClick={() => setAttendanceState({...attendanceState, [s.id]: 'Absent'})}
                      style={{ padding: '6px 12px', borderRadius: '4px', background: attendanceState[s.id] === 'Absent' ? '#ef4444' : 'transparent', border: '1px solid #ef4444', color: attendanceState[s.id] === 'Absent' ? 'white' : '#ef4444', cursor: 'pointer' }}>
                      <X size={16} /> Absent
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSaveAttendance}>Save Attendance</button>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
          <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>Attendance History</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Date</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Batch</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Present</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Absent</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Total</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Attendance %</th>
                <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ padding: '40px 20px', textAlign: 'center' }}>Loading...</td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: '40px 20px', textAlign: 'center' }}>No history found.</td></tr>
              ) : (
                history.map((record, i) => (
                  <React.Fragment key={i}>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: expandedRow === i ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                      <td style={{ padding: '16px 20px', color: 'white' }}>{record.date}</td>
                      <td style={{ padding: '16px 20px', color: 'white' }}>{record.batch}</td>
                      <td style={{ padding: '16px 20px', color: '#10b981' }}>{record.present}</td>
                      <td style={{ padding: '16px 20px', color: '#ef4444' }}>{record.absent}</td>
                      <td style={{ padding: '16px 20px', color: 'white' }}>{record.total}</td>
                      <td style={{ padding: '16px 20px', color: 'white' }}>{record.pct}%</td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <button 
                          className="btn-icon" 
                          onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                        >
                          <ChevronDown size={18} style={{ transform: expandedRow === i ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        </button>
                      </td>
                    </tr>
                    {expandedRow === i && record.students && (
                      <tr style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                        <td colSpan="7" style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                            {record.students.map((student, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                <span style={{ color: 'white', fontSize: '0.9rem' }}>{student.name}</span>
                                <span style={{ color: student.status === 'Present' ? '#10b981' : '#ef4444', fontSize: '0.9rem', fontWeight: 600 }}>{student.status}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
