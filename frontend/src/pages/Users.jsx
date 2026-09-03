import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Edit2, Trash2, X } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Users() {
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'COACH'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await apiClient('/users');
      setUsers(data);
    } catch (err) {
      console.error(err);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await apiClient(`/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await apiClient('/users', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiClient(`/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({ name: user.name, email: user.email, password: '', role: user.role, requires_password_change: false });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'COACH', requires_password_change: true });
    }
    setShowModal(true);
  };


  return (
    <div className="users-page" style={{ padding: '24px' }}>
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={24} className="text-primary" />
          Staff & Coaches
        </h2>
        {isSuperAdmin && (
          <button className="btn btn-primary" onClick={() => openModal()}>
            <UserPlus size={18} />
            Add User
          </button>
        )}
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Last Login</th>
              {isSuperAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5">Loading...</td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`status-badge ${u.role.toLowerCase()}`}>
                    {u.role}
                  </span>
                </td>
                <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}</td>
                {isSuperAdmin && (
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" onClick={() => openModal(u)}><Edit2 size={16}/></button>
                      <button className="btn-icon text-danger" onClick={() => handleDelete(u.id)}><Trash2 size={16}/></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="form-grid">
              <div className="form-group">
                <label>Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="input-field" />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="input-field">
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Full Access)</option>
                  <option value="BRANCH_MANAGER">BRANCH_MANAGER (Branch Access)</option>
                  <option value="COACH">COACH (Coach Access)</option>
                  <option value="RECEPTION">RECEPTION (Frontdesk)</option>
                  <option value="READER">READER (Read Only)</option>
                </select>
              </div>
              <div className="form-group">
                <label>{editingUser ? 'New Password (Leave blank to keep current)' : 'Password'}</label>
                <input 
                  type="password" 
                  required={!editingUser} 
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                  className="input-field" 
                />
              </div>
              {!editingUser && (
                <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="require_pass_change"
                    checked={formData.requires_password_change}
                    onChange={e => setFormData({...formData, requires_password_change: e.target.checked})}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="require_pass_change" style={{ cursor: 'pointer', margin: 0, fontSize: '0.9rem' }}>Force password change on first login</label>
                </div>
              )}
              <div className="form-actions" style={{ gridColumn: '1 / -1', marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
