import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';
import { UserPlus, CheckCircle, Award, IndianRupee, Calendar, TrendingUp, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';

export const Dashboard = () => {
  const [data, setData] = useState({
    pending_fees: 0,
    overdue_fees: 0,
    overdue_students_list: [],
    upcoming_due_list: [],
    total_students: 0,
    inactive_students: 0,
    today_attendance: 0,
    age_distribution: {},
    balance_distribution: {},
    consistency_distribution: {"No Data": 100},
    level_distribution: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient('/analytics/dashboard')
      
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load dashboard data:", err);
        setLoading(false);
      });
  }, []);

  // Format data for charts
  const ageData = Object.entries(data.age_distribution || {}).map(([name, value]) => ({ name, value }));
  const classesData = Object.entries(data.balance_distribution || {}).map(([name, value]) => ({ name, value }));
  const riskData = Object.entries(data.consistency_distribution || {}).map(([name, value]) => ({ name, value }));
  
  const growthData = Object.entries(data.growth || {}).map(([name, value]) => ({ name, value }));
  const levelData = Object.entries(data.level_distribution || {}).map(([name, value]) => ({ name, value }));
  const tournamentData = Object.entries(data.tournament_activity || {}).map(([name, value]) => ({ name, value }));

  
  const getRiskColor = (name) => {
    if (name === 'Regular') return '#10b981';
    if (name === 'Moderate') return '#f59e0b';
    if (name === 'Irregular') return '#ef4444';
    return '#94a3b8'; // No Data
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      {/* Header & Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px', color: 'var(--text-main)' }}>Analytics & Overview</h1>
          <p style={{ color: 'var(--text-muted)' }}>Track academy success and operational tasks.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/students" className="btn" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={16} /> New Student
          </Link>
          <Link to="/attendance" className="btn" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} /> Mark Attendance
          </Link>
          <Link to="/students" className="btn" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', border: '1px solid rgba(236,72,153,0.3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={16} /> Class Credits
          </Link>
          <Link to="/finance" className="btn" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IndianRupee size={16} /> Record Fee
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        
        {/* Pending Fees Card */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending Fees</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b' }}>{data.overdue_fees} OVERDUE • {data.pending_fees - data.overdue_fees} DUE SOON</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '120px' }}>
            
            {data.overdue_students_list.map((s, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    {s.name} <span style={{ fontSize: '0.75rem', color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>OVERDUE</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }}>Overdue</div>
                </div>
              </div>
            ))}
            {data.upcoming_due_list.map((s, idx) => (
              <div key={`u-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    {s.name} <span style={{ fontSize: '0.75rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>{s.classes_left} LEFT</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f59e0b' }}>Due soon</div>
                </div>
              </div>
            ))}
            {data.overdue_students_list.length === 0 && data.upcoming_due_list.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No pending fees.</div>
            )}

          </div>
          <div style={{ marginTop: '16px', textAlign: 'right' }}>
            <Link to="/finance" style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}>View All Details →</Link>
          </div>
        </div>

        {/* Total Students Card */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Students</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>{data.total_students}</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>({data.inactive_students} Archived)</span>
              </div>
              <div style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 500, marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={16} /> Active Roster
              </div>
            </div>
            <div style={{ width: '80px', height: '80px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{value: data.total_students || 1}]} innerRadius={25} outerRadius={35} fill="#3b82f6" dataKey="value" stroke="none" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Attendance Today Card */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attendance Today</span>
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>{data.today_attendance}</div>
            <div style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 500, marginTop: '35px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={16} /> Students Present
            </div>
          </div>
        </div>

      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        
        {/* Age Distribution */}
        <div className="glass-panel" style={{ minHeight: '300px' }}>
          <h3 style={{ marginBottom: '24px', color: 'var(--text-main)' }}>Student Age Distribution</h3>
          <div style={{ height: '250px' }}>
            {ageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data</div>
            )}
          </div>
        </div>

        {/* Remaining Classes */}
        <div className="glass-panel" style={{ minHeight: '300px' }}>
          <h3 style={{ marginBottom: '24px', color: 'var(--text-main)' }}>Remaining Classes Left</h3>
          <div style={{ height: '250px' }}>
            {classesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classesData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {
                      classesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === '0' ? '#ef4444' : '#3b82f6'} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data</div>
            )}
          </div>
        </div>

        {/* Attendance Risk */}
        <div className="glass-panel" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '24px', color: 'var(--text-main)' }}>Attendance Risk</h3>
          <div style={{ height: '220px' }}>
            {riskData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskData}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getRiskColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data</div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: 'auto', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div style={{ width: '20px', height: '6px', background: '#10b981', borderRadius: '2px' }}></div> Regular
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div style={{ width: '20px', height: '6px', background: '#f59e0b', borderRadius: '2px' }}></div> Moderate
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div style={{ width: '20px', height: '6px', background: '#ef4444', borderRadius: '2px' }}></div> Irregular
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div style={{ width: '20px', height: '6px', background: '#94a3b8', borderRadius: '2px' }}></div> No Data
            </div>
          </div>
        </div>

      </div>

      {/* Growth & Skill Level Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="glass-panel" style={{ minHeight: '300px' }}>
          <h3 style={{ marginBottom: '24px', color: 'var(--text-main)' }}>Student Growth (Monthly)</h3>
          <div style={{ height: '250px' }}>
            {growthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data</div>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '24px', color: 'var(--text-main)' }}>Skill Level</h3>
          <div style={{ height: '220px' }}>
            {levelData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={levelData}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {levelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data</div>
            )}
          </div>
        </div>
      </div>

      {/* Tournament Activity Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="glass-panel" style={{ minHeight: '300px' }}>
          <h3 style={{ marginBottom: '24px', color: 'var(--text-main)' }}>Tournament Activity</h3>
          <div style={{ height: '250px' }}>
            {tournamentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tournamentData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} />
                  <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data</div>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Total Tournaments</h3>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{data.total_tournaments}</div>
          <div style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 500, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Trophy size={16} /> All time record
          </div>
        </div>
      </div>

    </div>
  );
};
