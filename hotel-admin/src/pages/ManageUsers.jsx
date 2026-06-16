import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { RefreshCw, Search, UserCheck, UserX, Sun, Moon, Edit3, X, Users } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';

const ManageUsers = () => {
  const { user, apiFetch } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Guest edit states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    is_verified: false
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/admin/users');
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load guest profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // Socket.io live updates for guests
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleUserUpdated = (data) => {
      fetchUsers();
      if (data.action === 'update' && data.sender_id !== user?.id) {
        toast.success(`Guest profile for ${data.user?.name || ''} has been updated in real-time.`, { id: 'admin-users-toast' });
      }
    };

    socket.on('user:updated', handleUserUpdated);
    return () => {
      socket.off('user:updated', handleUserUpdated);
    };
  }, [socket, user]);

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setFormData({
      name: u.name || '',
      email: u.email || '',
      phone_number: u.phone_number || '',
      is_verified: !!u.is_verified
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and email are required.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/admin/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      toast.success('Guest profile updated successfully!');
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone_number?.includes(search)
  );

  const verified = users.filter(u => u.is_verified).length;
  const unverified = users.length - verified;

  const getInitials = (name) =>
    name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';

  const avatarColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#0ea5e9', '#84cc16'];
  const colorFor = (id) => avatarColors[(id || 0) % avatarColors.length];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar />

      <div className="admin-main">
        {/* Topbar */}
        <div className="admin-topbar">
          <div>
            <div className="topbar-title">Guests</div>
            <div className="topbar-breadcrumb">Registered user accounts & verification status</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={toggleTheme}
              className="btn btn-secondary btn-icon"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun size={13} style={{ color: '#fb923c' }} /> : <Moon size={13} style={{ color: '#818cf8' }} />}
            </button>
            <button onClick={fetchUsers} className="btn btn-secondary btn-icon" title="Refresh">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        <div className="admin-content">

          {/* Stats row */}
          {!loading && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Guests', value: users.length, color: 'var(--text-primary)', bg: 'rgba(255,255,255,0.04)' },
                { label: 'Verified', value: verified, color: '#4ade80', bg: 'rgba(34,197,94,0.08)' },
                { label: 'Unverified', value: unverified, color: '#fb923c', bg: 'rgba(251,146,60,0.08)' },
              ].map(s => (
                <div key={s.label} style={{ padding: '12px 18px', borderRadius: 10, background: s.bg, border: '1px solid var(--border-subtle)', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'Inter' }}>{s.value}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <div style={{ position: 'relative', width: 280, marginBottom: 16 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="admin-input"
              style={{ paddingLeft: 28, height: 36, fontSize: 12 }}
            />
          </div>

          {/* Table */}
          <div className="panel-card">
            {loading ? (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 52 }} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={26} style={{ color: 'var(--text-muted)', strokeWidth: 1.5 }} />
                </div>
                <div className="empty-state-text">No guests found</div>
                <div className="empty-state-sub">Registered users will appear here</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Guest</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th style={{ textAlign: 'center' }}>Verification</th>
                      <th style={{ textAlign: 'right' }}>Joined</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 9, background: colorFor(u.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                              {getInitials(u.name)}
                            </div>
                            <div className="td-primary" style={{ fontSize: 13 }}>{u.name}</div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{u.email}</td>
                        <td className="td-mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.phone_number || '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          {u.is_verified ? (
                            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <UserCheck size={10} /> Verified
                            </span>
                          ) : (
                            <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <UserX size={10} /> Unverified
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }} className="td-mono">
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.created_at?.substring(0, 10)}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button onClick={() => handleOpenEdit(u)} className="btn btn-secondary btn-icon btn-sm" title="Edit Profile">
                            <Edit3 size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!loading && (
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
              Showing {filtered.length} of {users.length} guests
            </div>
          )}

          {/* Guest Profile Edit Modal */}
          {modalOpen && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
              <div className="modal-box" style={{ maxWidth: 440 }}>
                <div className="modal-header">
                  <div className="modal-title">Edit Guest Profile</div>
                  <button onClick={() => setModalOpen(false)} className="btn btn-ghost btn-icon" style={{ padding: 5 }}>
                    <X size={15} />
                  </button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label className="input-label">Full Name</label>
                      <input
                        type="text"
                        required
                        className="admin-input"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="input-label">Email Address</label>
                      <input
                        type="email"
                        required
                        className="admin-input"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="input-label">Phone Number</label>
                      <input
                        type="text"
                        className="admin-input"
                        placeholder="e.g. +91 98765 43210"
                        value={formData.phone_number}
                        onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                      <input
                        type="checkbox"
                        id="is_verified"
                        checked={formData.is_verified}
                        onChange={e => setFormData({ ...formData, is_verified: e.target.checked })}
                        style={{ cursor: 'pointer', width: 15, height: 15 }}
                      />
                      <label htmlFor="is_verified" className="input-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>
                        Verified Guest Status
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: 10, paddingTop: 10 }}>
                      <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                        {saving ? 'Saving...' : 'Save Profile'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ManageUsers;
