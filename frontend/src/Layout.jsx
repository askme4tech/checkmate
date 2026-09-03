import React from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Wallet, 
  Settings, 
  Bell, 
  Search,
  MessageSquare,
  ChevronDown,
  CheckCircle,
  IndianRupee,
  Trophy,
  LineChart,
  PieChart,
  BookOpen,
  TrendingUp,
  LogOut
} from 'lucide-react';
import './Layout.css';
import { ChangePassword } from './pages/ChangePassword';

const Sidebar = () => {
  const { isReader, isSuperAdmin } = useAuth();
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>♟️</span>
          <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>Checkmate</span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <div className="nav-section-title" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '16px 24px 8px 24px' }}>Academy Ops</div>
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/crm" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <MessageSquare size={20} />
          <span>Enquiries</span>
        </NavLink>
        <NavLink to="/students" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          <span>Students</span>
        </NavLink>
        <NavLink to="/batches" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Calendar size={20} />
          <span>Batches</span>
        </NavLink>
        <NavLink to="/coaches" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          <span>Staff & Coaches</span>
        </NavLink>
        <NavLink to="/attendance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CheckCircle size={20} />
          <span>Attendance</span>
        </NavLink>
        {!isReader && (
          <>
            <NavLink to="/fees" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <IndianRupee size={20} />
              <span>Fees</span>
            </NavLink>
            <NavLink to="/finance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Wallet size={20} />
              <span>Fee & Balance Tracker</span>
            </NavLink>
          </>
        )}
        <NavLink to="/tournaments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Trophy size={20} />
          <span>Tournaments</span>
        </NavLink>

        <div className="nav-section-title" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '24px 24px 8px 24px' }}>Performance Center</div>
        <NavLink to="/performance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LineChart size={20} />
          <span>Performance Dash</span>
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <PieChart size={20} />
          <span>Student Analytics</span>
        </NavLink>
        <NavLink to="/mastery" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <BookOpen size={20} />
          <span>Conceptual Mastery</span>
        </NavLink>
        <NavLink to="/progression" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <TrendingUp size={20} />
          <span>Level Progression</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        {!isReader && (
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={20} />
            <span>Settings</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
};

const Topbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Theme state
  const [isDark, setIsDark] = React.useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/crm': return 'Enquiries & CRM';
      case '/students': return 'Student Directory';
      case '/batches': return 'Batches & Schedule';
      case '/finance': return 'Finance & Ledgers';
      default: return 'Checkmate Academy';
    }
  };

  return (
    <header className="topbar glass-panel">
      <div className="page-title">
        <h1>{getPageTitle()}</h1>
      </div>
      
      <div className="topbar-actions">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Search students, batches..." />
        </div>
        
        <button className="btn-icon" onClick={() => setIsDark(!isDark)} title="Toggle Theme">
          {isDark ? <span style={{fontSize:'16px'}}>☀️</span> : <span style={{fontSize:'16px'}}>🌙</span>}
        </button>

        <button className="btn-icon">
          <Bell size={20} />
          <span className="badge-dot"></span>
        </button>
        
        <div className="user-profile">
          <div className="avatar">{user?.name ? user.name.charAt(0).toUpperCase() : 'A'}</div>
          <div className="user-info">
            <span className="name">{user?.name || 'Admin User'}</span>
            <span className="role">{user?.role || 'Head Coach'}</span>
          </div>
        </div>

        <button className="btn-icon" onClick={() => { logout(); navigate('/login'); }} title="Logout" style={{ marginLeft: '8px', color: '#ef4444' }}>
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export const Layout = () => {
  const { requiresPasswordChange } = useAuth();

  if (requiresPasswordChange) {
    return <ChangePassword />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Topbar />
        <div className="page-scroll">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
