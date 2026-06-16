import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Edit2, Trash2, X, AlertTriangle, Clock, ConciergeBell, ChefHat } from 'lucide-react';

const StaffManagement = () => {
  const { apiFetch } = useAuth();
  const socket = useSocket();

  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'attendance'
  const [staffList, setStaffList] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal Control States
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('waiter');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [shiftTiming, setShiftTiming] = useState('09:00 - 17:00');
  const [submitting, setSubmitting] = useState(false);

  const retryTimeoutRef = React.useRef(null);

  const fetchStaffData = async () => {
    try {
      setError(null);
      // Fetch both Roster and Attendance in parallel to keep everything in sync in the background
      const [staffData, attendanceData] = await Promise.all([
        apiFetch('/staff'),
        apiFetch('/staff/attendance')
      ]);
      setStaffList(Array.isArray(staffData) ? staffData : []);
      setAttendanceLogs(Array.isArray(attendanceData) ? attendanceData : []);
      setLoading(false);
    } catch (err) {
      console.error('Staff/Attendance fetch failure:', err);
      setError('Failed to retrieve personnel records. Retrying connection to backend...');
      setLoading(true); // Retain loading shell when backend is offline
      
      // Auto-retry in 3 seconds to check if backend came online
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(fetchStaffData, 3000);
    }
  };

  useEffect(() => {
    fetchStaffData();
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  // Live socket listeners to sync staff updates & attendance logs in real time
  useEffect(() => {
    if (!socket) return;
    const handleUserUpdate = (data) => {
      console.log('⚡ Real-time user roster or attendance update:', data);
      fetchStaffData();
    };
    const handleUserDelete = (data) => {
      console.log('⚡ Real-time user deletion:', data);
      fetchStaffData();
    };
    socket.on('user-update', handleUserUpdate);
    socket.on('user-delete', handleUserDelete);
    return () => {
      socket.off('user-update', handleUserUpdate);
      socket.off('user-delete', handleUserDelete);
    };
  }, [socket]);

  const openCreateModal = () => {
    setModalMode('create');
    setName('');
    setEmail('');
    setPassword('');
    setRole('waiter');
    setPhoneNumber('');
    setShiftTiming('09:00 - 17:00');
    setEditingEmployee(null);
    setShowModal(true);
  };

  const openEditModal = (employee) => {
    setModalMode('edit');
    setEditingEmployee(employee);
    setName(employee.name);
    setEmail(employee.email);
    setPassword(''); // Leave blank unless changing
    setRole(employee.role);
    setPhoneNumber(employee.phone_number || '');
    setShiftTiming(employee.shift_timing || '09:00 - 17:00');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you absolutely sure you want to remove this employee account? Historically bound attendance logs and waiter order lists might block deletion.')) return;
    try {
      await apiFetch(`/staff/${id}`, { method: 'DELETE' });
      fetchStaffData();
    } catch (err) {
      alert(err.message || 'Failed to remove employee profile.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role,
      phone_number: phoneNumber.trim(),
      shift_timing: shiftTiming.trim(),
    };

    if (modalMode === 'create' || (password && password !== '')) {
      payload.password = password;
    }

    try {
      if (modalMode === 'create') {
        await apiFetch('/staff', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/staff/${editingEmployee.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      fetchStaffData();
    } catch (err) {
      setError(err.message || 'Roster operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Stagger configurations
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  if (loading && staffList.length === 0 && attendanceLogs.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="page-header-block">
          <div>
            <div className="shimmer-skeleton" style={{ width: '15rem', height: '2rem', marginBottom: '0.5rem' }} />
            <div className="shimmer-skeleton" style={{ width: '25rem', height: '0.8rem' }} />
          </div>
          <div className="shimmer-skeleton" style={{ width: '10rem', height: '2.25rem', borderRadius: 'var(--radius-sm)' }} />
        </div>

        <div className="glass-card" style={{ height: '3.5rem', display: 'flex', gap: '1rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <div className="shimmer-skeleton" style={{ width: '15%', height: '100%', borderRadius: 'var(--radius-md)' }} />
          <div className="shimmer-skeleton" style={{ width: '18%', height: '100%', borderRadius: 'var(--radius-md)' }} />
        </div>

        <div className="glass-card" style={{ padding: 0 }}>
          <div className="custom-table-container">
            <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {[1, 2, 3, 4, 5].map(idx => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '30%' }}>
                    <div className="shimmer-skeleton shimmer-circle" style={{ width: '3rem', height: '3rem', flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                      <div className="shimmer-skeleton" style={{ width: '60%', height: '0.95rem' }} />
                      <div className="shimmer-skeleton" style={{ width: '40%', height: '0.7rem' }} />
                    </div>
                  </div>
                  <div className="shimmer-skeleton" style={{ width: '15%', height: '1rem' }} />
                  <div className="shimmer-skeleton" style={{ width: '10%', height: '1.25rem', borderRadius: '999px' }} />
                  <div className="shimmer-skeleton" style={{ width: '15%', height: '1rem' }} />
                  <div className="shimmer-skeleton" style={{ width: '12%', height: '1rem' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      
      {/* Header Panel */}
      <div className="page-header-block" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Staff & Hours Management</h1>
          <p className="page-subtitle">Register staff credentials, oversee shift durations, and monitor live clock-in/out attendance logs.</p>
        </div>
        
        {activeTab === 'roster' && (
          <motion.button 
            onClick={openCreateModal}
            className="button-primary"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus size={16} />
            Register Staff Account
          </motion.button>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="menu-controls glass-card" style={{ padding: '0.5rem', display: 'flex', width: 'max-content', marginBottom: '0.5rem' }}>
        <div className="menu-tabs">
          <button
            onClick={() => setActiveTab('roster')}
            className={`menu-tab-btn ${activeTab === 'roster' ? 'menu-tab-btn-active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Users size={14} />
            Staff Roster ({staffList.length})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`menu-tab-btn ${activeTab === 'attendance' ? 'menu-tab-btn-active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Clock size={14} />
            Attendance History ({attendanceLogs.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-card" style={{ borderLeft: '4px solid var(--color-danger)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--color-danger-bg)' }}>
          <AlertTriangle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-danger)' }}>{error}</span>
        </div>
      )}

      {/* Tab 1: Staff Roster Profiles */}
      <AnimatePresence mode="wait">
        {!loading && activeTab === 'roster' && (
          <motion.div 
            key="roster-tab"
            variants={itemVariants}
            className="glass-card" 
            style={{ padding: 0 }}
          >
            {/* On-Duty / Available Staff Quick-View */}
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.04) 0%, rgba(0, 0, 0, 0) 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    height: '0.6rem',
                    width: '0.6rem',
                    borderRadius: '50%',
                    background: 'var(--color-success)',
                    boxShadow: 'var(--shadow-glow-available)',
                    animation: 'pulse 2s infinite'
                  }} />
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                    Currently Available / On-Duty Staff
                  </h3>
                </div>
                <span className="status-badge status-available" style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.75rem' }}>
                  {staffList.filter(s => s.attendance_status === 'clocked_in').length} Active Staff Present
                </span>
              </div>

              {staffList.filter(s => s.attendance_status === 'clocked_in').length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 650 }}>
                    No staff members are currently clocked in.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                  {staffList.filter(s => s.attendance_status === 'clocked_in').map((employee) => (
                    <motion.div
                      key={`available-${employee.id}`}
                      className="glass-card"
                      style={{
                        padding: '1rem',
                        margin: 0,
                        border: '1px solid rgba(16, 185, 129, 0.15)',
                        background: 'rgba(16, 185, 129, 0.02)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      whileHover={{ 
                        y: -3, 
                        borderColor: 'rgba(16, 185, 129, 0.35)', 
                        background: 'rgba(16, 185, 129, 0.04)',
                        boxShadow: '0 6px 16px rgba(16, 185, 129, 0.05)'
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      {/* Glow background accent */}
                      <div style={{
                        position: 'absolute',
                        top: '-20%',
                        right: '-20%',
                        width: '60px',
                        height: '60px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        filter: 'blur(20px)',
                        borderRadius: '50%'
                      }} />

                      {/* Avatar with dynamic active gradient */}
                      <div 
                        className="staff-avatar-circle" 
                        style={{ 
                          height: '2.5rem', 
                          width: '2.5rem', 
                          minWidth: '2.5rem', 
                          fontSize: '0.95rem',
                          background: employee.role === 'waiter' 
                            ? 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' 
                            : 'linear-gradient(135deg, var(--color-warning), var(--color-danger))',
                          color: '#ffffff',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                          fontWeight: 800
                        }}
                      >
                        {employee.name.charAt(0)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {employee.name}
                        </p>
                        <p style={{ margin: '0.15rem 0 0.4rem 0', fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {employee.email}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span className={`status-badge ${employee.role === 'waiter' ? 'status-ready' : 'status-cooking'}`} style={{ fontSize: '0.55rem', padding: '0.1rem 0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            {employee.role === 'waiter' ? <><ConciergeBell size={10} strokeWidth={2.5}/> Waiter</> : <><ChefHat size={10} strokeWidth={2.5}/> Chef</>}
                          </span>
                          <span style={{ fontSize: '0.6rem', color: 'var(--color-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                            <span style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--color-success)' }}></span>
                            Active
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Phone Contact</th>
                    <th>Role / Title</th>
                    <th>Shift Timings</th>
                    <th>Shift Activity</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div className="staff-avatar-circle" style={{ height: '2.5rem', width: '2.5rem', minWidth: '2.5rem', fontSize: '0.95rem' }}>
                            {employee.name.charAt(0)}
                          </div>
                          <div>
                            <p className="staff-card-name" style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{employee.name}</p>
                            <p className="staff-card-email" style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>{employee.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {employee.phone_number || 'N/A'}
                      </td>
                      <td>
                        <span className={`status-badge ${
                          employee.role === 'waiter' ? 'status-ready' : 'status-cooking'
                        }`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          {employee.role === 'waiter' ? <><ConciergeBell size={14} strokeWidth={2.5} /> Waiter</> : <><ChefHat size={14} strokeWidth={2.5} /> Chef</>}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {employee.shift_timing}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span 
                            className={`status-badge ${employee.attendance_status === 'clocked_in' ? 'status-available status-glow-available' : ''}`}
                            style={{ 
                              padding: employee.attendance_status === 'clocked_in' ? undefined : '0.25rem 0.6rem',
                              background: employee.attendance_status === 'clocked_in' ? undefined : 'var(--bg-primary)',
                              color: employee.attendance_status === 'clocked_in' ? undefined : 'var(--text-muted)',
                              boxShadow: 'none'
                            }}
                          >
                            {employee.attendance_status === 'clocked_in' ? '● Clocked In' : 'Clocked Out'}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button 
                            onClick={() => openEditModal(employee)}
                            className="table-icon-btn"
                            title="Configure Account"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={() => handleDelete(employee.id)}
                            className="table-icon-btn table-icon-btn-danger"
                            title="Remove Account"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Tab 2: Attendance Logs History */}
        {!loading && activeTab === 'attendance' && (
          <motion.div 
            key="attendance-tab"
            variants={itemVariants}
            className="glass-card" 
            style={{ padding: 0 }}
          >
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Shift Date</th>
                    <th>Employee</th>
                    <th>Role</th>
                    <th>Clocked In</th>
                    <th>Clocked Out</th>
                    <th style={{ textAlign: 'right' }}>Elapsed Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontWeight: 650 }}>
                        No staff attendance records logged for today or past dates.
                      </td>
                    </tr>
                  ) : (
                    attendanceLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {new Date(log.record_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {log.name}
                        </td>
                        <td>
                          <span className={`status-badge ${
                            log.role === 'waiter' ? 'status-ready' : 'status-cooking'
                          }`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            {log.role === 'waiter' ? <><ConciergeBell size={14} strokeWidth={2.5} /> Waiter</> : <><ChefHat size={14} strokeWidth={2.5} /> Chef</>}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {new Date(log.clock_in).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {log.clock_out ? (
                            new Date(log.clock_out).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })
                          ) : (
                            <span className="status-badge status-available status-glow-available" style={{ fontSize: '0.65rem' }}>Shift In-Progress</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`status-badge ${log.clock_out ? 'status-ready' : ''}`} style={{ background: log.clock_out ? undefined : 'var(--bg-primary)', color: log.clock_out ? undefined : 'var(--text-muted)', boxShadow: 'none' }}>
                            {parseFloat(log.hours_worked).toFixed(2)} hrs
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roster Registration Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="modal-backdrop">
            <motion.div 
              className="modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            >
              <div className="modal-header">
                <h2 className="modal-title">
                  {modalMode === 'create' ? 'Register Employee Account' : `Modify Profile: ${editingEmployee?.name}`}
                </h2>
                <button onClick={() => setShowModal(false)} className="modal-close-btn">
                  <X size={18} />
                </button>
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-danger-bg)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
                  <AlertTriangle size={14} style={{ color: 'var(--color-danger)' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 650, color: 'var(--color-danger)' }}>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Staff Email (Login ID)</label>
                  <input 
                    type="email"
                    required
                    placeholder="e.g. rahul@restaurant.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {modalMode === 'create' ? 'Secure Password' : 'New Password (Leave blank to keep current)'}
                  </label>
                  <input 
                    type="password"
                    required={modalMode === 'create'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Contact Number</label>
                    <input 
                      type="tel"
                      placeholder="9876543210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Roster Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="select-field"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                      <option value="waiter">Waitstaff</option>
                      <option value="kitchen">Kitchen Chef</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Scheduled Shift Timing</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. 09:00 - 17:00"
                    value={shiftTiming}
                    onChange={(e) => setShiftTiming(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="button-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="button-primary"
                  >
                    {submitting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" style={{ display: 'inline-block', width: '1rem', height: '1rem', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }}></span>
                    ) : (
                      <span>{modalMode === 'create' ? 'Register Employee' : 'Update Profile'}</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StaffManagement;
