import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import TableVisual from '../components/TableVisual';

const TableManagement = () => {
  const { apiFetch } = useAuth();
  const socket = useSocket();

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal Control States
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingTable, setEditingTable] = useState(null);
  
  // Form States
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [status, setStatus] = useState('available');
  const [submitting, setSubmitting] = useState(false);

  const retryTimeoutRef = React.useRef(null);

  const fetchTables = async () => {
    try {
      const data = await apiFetch('/tables');
      if (Array.isArray(data)) {
        setTables(data.sort((a, b) => a.table_number - b.table_number));
      } else {
        setTables([]);
      }
      setError(null);
      setLoading(false); // Success! Hide loading skeleton
    } catch (err) {
      console.error('Tables fetch failure:', err);
      setError('Failed to fetch restaurant tables. Retrying connection to backend...');
      setLoading(true); // Retain loading shell when backend is offline
      
      // Auto-retry in 3 seconds to check if backend came online
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(fetchTables, 3000);
    }
  };

  useEffect(() => {
    fetchTables();
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  // Listen for socket table updates from waiter/kitchen checkouts
  useEffect(() => {
    if (!socket) return;

    const handleTableUpdate = () => {
      fetchTables();
    };

    socket.on('table-update', handleTableUpdate);
    return () => {
      socket.off('table-update', handleTableUpdate);
    };
  }, [socket]);

  const openCreateModal = () => {
    setModalMode('create');
    setTableNumber('');
    setCapacity('4');
    setStatus('available');
    setEditingTable(null);
    setShowModal(true);
  };

  const openEditModal = (table) => {
    setModalMode('edit');
    setEditingTable(table);
    setTableNumber(table.table_number.toString());
    setCapacity(table.capacity.toString());
    setStatus(table.status);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you absolutely sure you want to delete this table? Historical order records referencing this table will prevent deletion.')) return;
    try {
      await apiFetch(`/tables/${id}`, { method: 'DELETE' });
      fetchTables();
    } catch (err) {
      alert(err.message || 'Failed to delete table. It might have orders bound to it.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      table_number: parseInt(tableNumber),
      capacity: parseInt(capacity),
      status
    };

    try {
      if (modalMode === 'create') {
        await apiFetch('/tables', {
          method: 'POST',
          body: JSON.stringify({ table_number: payload.table_number, capacity: payload.capacity }),
        });
      } else {
        await apiFetch(`/tables/${editingTable.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      fetchTables();
    } catch (err) {
      setError(err.message || 'Operations failed.');
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
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  if (loading && tables.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="page-header-block">
          <div>
            <div className="shimmer-skeleton" style={{ width: '15rem', height: '2rem', marginBottom: '0.5rem' }} />
            <div className="shimmer-skeleton" style={{ width: '25rem', height: '0.8rem' }} />
          </div>
          <div className="shimmer-skeleton" style={{ width: '10rem', height: '2.25rem', borderRadius: 'var(--radius-sm)' }} />
        </div>
        
        <div className="tables-layout-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(idx => (
            <div key={idx} className="glass-card" style={{ height: '11rem', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
              <div className="shimmer-skeleton" style={{ width: '45%', height: '1.25rem' }} />
              <div className="shimmer-skeleton" style={{ width: '60%', height: '0.85rem' }} />
              <div className="shimmer-skeleton" style={{ width: '30%', height: '1.2rem', borderRadius: '999px', marginTop: '0.5rem' }} />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', width: '100%' }}>
                <div className="shimmer-skeleton" style={{ flex: 1, height: '1.8rem', borderRadius: 'var(--radius-sm)' }} />
                <div className="shimmer-skeleton" style={{ flex: 1, height: '1.8rem', borderRadius: 'var(--radius-sm)' }} />
              </div>
            </div>
          ))}
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
      <div className="page-header-block" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Tables Management</h1>
          <p className="page-subtitle">Control restaurant table structures, check capacities, and edit layout grids.</p>
        </div>
        <motion.button 
          onClick={openCreateModal}
          className="button-primary"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={16} />
          Create Table Layout
        </motion.button>
      </div>

      {error && (
        <div className="glass-card" style={{ borderLeft: '4px solid var(--color-danger)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--color-danger-bg)' }}>
          <AlertTriangle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-danger)' }}>{error}</span>
        </div>
      )}

      <div className="tables-layout-grid">
        {tables.map((table) => {
          const accentColor =
            table.status === 'available' ? '#22c55e' :
            table.status === 'cooking'   ? '#f97316' :
            table.status === 'ready'     ? '#3b82f6' : '#ef4444';

          return (
            <motion.div
              key={table.id}
              className="glass-card table-card-item"
              variants={itemVariants}
              whileHover={{ y: -4, scale: 1.01 }}
              style={{ padding: 0, display: 'flex', flexDirection: 'column' }}
            >
              {/* Colored status accent bar */}
              <div style={{
                height: '0.35rem',
                width: '100%',
                background: accentColor,
                borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
              }} />

              {/* Card body */}
              <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', flex: 1, alignItems: 'center' }}>

                {/* Title row: table name + badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.4rem', flexWrap: 'wrap', width: '100%' }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 className="table-card-num" style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', wordBreak: 'break-word' }}>
                      Table {table.table_number}
                    </h3>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.1rem' }}>
                      {table.capacity} seats
                    </div>
                  </div>
                  <span className={`status-badge ${
                    table.status === 'available' ? 'status-available' :
                    table.status === 'cooking'   ? 'status-cooking'   :
                    table.status === 'ready'     ? 'status-ready'     : 'status-occupied'
                  }`} style={{ flexShrink: 0, alignSelf: 'flex-start', fontSize: '0.6rem' }}>
                    {table.status}
                  </span>
                </div>

                {/* Chair + Table visual */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem 0' }}>
                  <TableVisual
                    capacity={table.capacity}
                    color={accentColor}
                    size={88}
                  />
                </div>

                {/* Actions */}
                <div className="table-card-actions" style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                  <button
                    onClick={() => openEditModal(table)}
                    className="table-icon-btn"
                    title="Configure Table"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(table.id)}
                    className="table-icon-btn table-icon-btn-danger"
                    title="Delete Table"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Elegant Glass Modal Form */}
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
                  {modalMode === 'create' ? 'Add Restaurant Table' : `Configure Table ${editingTable?.table_number}`}
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
                  <label className="form-label">Table Number</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 11"
                    value={tableNumber}
                    disabled={modalMode === 'edit'}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Seating Capacity</label>
                  <select
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="select-field"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  >
                    <option value="2">2 Seats (Couples)</option>
                    <option value="4">4 Seats (Standard Family)</option>
                    <option value="6">6 Seats (Large Group)</option>
                    <option value="8">8 Seats (Banquets)</option>
                    <option value="10">10 Seats (VIP Suites)</option>
                  </select>
                </div>

                {modalMode === 'edit' && (
                  <div className="form-group">
                    <label className="form-label">Table Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="select-field"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="cooking">Cooking</option>
                      <option value="ready">Ready</option>
                    </select>
                  </div>
                )}

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
                      <span>{modalMode === 'create' ? 'Assemble Table' : 'Save Configurations'}</span>
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

export default TableManagement;
