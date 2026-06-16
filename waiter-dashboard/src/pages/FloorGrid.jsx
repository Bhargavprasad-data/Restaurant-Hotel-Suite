import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Phone, CheckCircle, RefreshCw, User } from 'lucide-react';
import TableVisual from '../components/TableVisual';

/* ── Status configuration ── */
const STATUS = {
  available: {
    accent: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.22)',
    label: 'Available', dotClass: 'bg-emerald-500',
  },
  occupied: {
    accent: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.22)',
    label: 'Occupied',  dotClass: 'bg-rose-500',
  },
  cooking: {
    accent: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.22)',
    label: 'Cooking',   dotClass: 'bg-orange-500',
  },
  ready: {
    accent: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.22)',
    label: 'Ready ✦',   dotClass: 'bg-blue-500',
  },
};

/* ── Stat pill ── */
const StatPill = ({ label, value, colorClass, dotClass, pulse }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-semibold ${colorClass}`}>
    <span className={`w-2 h-2 rounded-full ${dotClass} ${pulse ? 'dot-pulse' : ''} shrink-0`} />
    <span className="opacity-75">{label}</span>
    <span className="font-black">{value}</span>
  </div>
);

/* ─────────────────────────────────────────────── */

const FloorGrid = () => {
  const { apiFetch } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [tables, setTables]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const retryTimeoutRef = React.useRef(null);

  /* ── Fetch tables with auto-retry ── */
  const fetchTables = async () => {
    try {
      const data = await apiFetch('/tables');
      setTables(data);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Cannot reach backend. Retrying…');
      setLoading(true); // Retain loading shell when backend is offline
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(fetchTables, 3000);
    }
  };

  useEffect(() => {
    fetchTables();
    return () => { if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current); };
  }, []);

  /* ── Live socket updates ── */
  useEffect(() => {
    if (!socket) return;
    const handler = ({ action, table }) => {
      setTables(prev => {
        if (action === 'create') return [...prev, table].sort((a, b) => a.table_number - b.table_number);
        if (action === 'delete') return prev.filter(t => t.id !== table.id);
        return prev.map(t => t.id === table.id ? table : t);
      });
    };
    socket.on('table-update', handler);
    return () => socket.off('table-update', handler);
  }, [socket]);

  const handleTableClick = (table) => {
    if (table.status === 'available') {
      setSelectedTable(table);
      setCustomerName('');
      setCustomerPhone('');
      setIsModalOpen(true);
    } else {
      navigate('/orders');
    }
  };

  const handleAllocate = (e) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !selectedTable) return;
    navigate(`/order-menu/${selectedTable.id}`, {
      state: { customerName, customerPhone, tableNumber: selectedTable.table_number },
    });
  };

  /* ── Stats ── */
  const count = (status) => tables.filter(t => t.status === status).length;

  /* ══════════ SHIMMER LOADING SKELETON ══════════ */
  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse-slow">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="shimmer-skeleton h-7 w-52 rounded-lg" />
            <div className="shimmer-skeleton h-3.5 w-36 rounded" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="shimmer-skeleton h-8 w-28 rounded-xl" />)}
          </div>
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="table-card">
              <div className="shimmer-skeleton h-1.5 w-full" />
              <div className="p-4 flex flex-col items-center gap-3">
                <div className="space-y-1 text-center">
                  <div className="shimmer-skeleton h-3 w-10 rounded mx-auto" />
                  <div className="shimmer-skeleton h-8 w-12 rounded-lg mx-auto" />
                </div>
                <div className="shimmer-skeleton h-5 w-20 rounded-full" />
                <div className="shimmer-skeleton h-3.5 w-16 rounded" />
                <div className="shimmer-skeleton h-8 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ══════════ MAIN VIEW ══════════ */
  return (
    <div className="p-6 space-y-6 max-w-7xl">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-slate-800 dark:text-white tracking-tight">
            Restaurant Floor Plan
          </h1>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-600 mt-0.5">
            Live Table Occupancy
          </p>
        </div>

        {/* Stats pills */}
        <div className="flex flex-wrap gap-2">
          <StatPill
            label="Total" value={tables.length}
            colorClass="bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.07]"
            dotClass="bg-slate-400"
          />
          <StatPill
            label="Available" value={count('available')}
            colorClass="bg-emerald-50 dark:bg-emerald-500/[0.1] text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/[0.2]"
            dotClass="bg-emerald-500"
          />
          <StatPill
            label="Cooking" value={count('cooking')}
            colorClass="bg-orange-50 dark:bg-orange-500/[0.1] text-orange-700 dark:text-orange-400 border border-orange-100 dark:border-orange-500/[0.2]"
            dotClass="bg-orange-500"
          />
          <StatPill
            label="Ready" value={count('ready')}
            colorClass="bg-blue-50 dark:bg-blue-500/[0.1] text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-500/[0.2]"
            dotClass="bg-blue-500"
            pulse={count('ready') > 0}
          />
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/[0.1]
          border border-rose-500/[0.2] text-rose-400 text-[12px] font-medium">
          <RefreshCw size={13} className="shrink-0 animate-spin" />
          {error}
        </div>
      )}

      {/* ── Table Cards Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tables.map(table => {
          const cfg = STATUS[table.status] || STATUS.available;
          const isReady = table.status === 'ready';
          return (
            <button
              key={table.id}
              onClick={() => handleTableClick(table)}
              className="table-card group text-left"
            >
              {/* Status accent top bar */}
              <div className="h-[4px] w-full shrink-0" style={{ background: cfg.accent }} />

              {/* Card body */}
              <div className="p-4 flex flex-col items-center gap-2 flex-1">

                {/* Table number label */}
                <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-600 self-start">
                  Table {table.table_number}
                </div>

                {/* Chair + Table SVG visual */}
                <div className="flex items-center justify-center py-0.5">
                  <TableVisual
                    capacity={table.capacity}
                    color={cfg.accent}
                    size={80}
                  />
                </div>

                {/* Status badge */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.06em]"
                  style={{ background: cfg.bg, color: cfg.accent, border: `1px solid ${cfg.border}` }}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotClass} ${isReady ? 'dot-pulse' : ''}`}
                  />
                  {cfg.label}
                </div>

                {/* Capacity */}
                <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-600 font-medium">
                  <span>{table.capacity} seats</span>
                </div>
              </div>

              {/* CTA row */}
              <div className="px-3 pb-3">
                <div
                  className="w-full py-2 rounded-lg text-[11px] font-bold text-center
                    transition-all duration-150 group-hover:brightness-110"
                  style={{
                    background: table.status === 'available' ? cfg.bg : 'rgba(255,255,255,0.04)',
                    color: table.status === 'available' ? cfg.accent : '#64748b',
                    border: `1px solid ${table.status === 'available' ? cfg.border : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {table.status === 'available' ? '＋ Seat & Order' : '→ View Orders'}
                </div>
              </div>

              {/* Hover border glow */}
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200"
                style={{ boxShadow: `inset 0 0 0 1.5px ${cfg.accent}50` }}
              />
            </button>
          );
        })}
      </div>

      {/* ══════ Seat Customer Modal ══════ */}
      {isModalOpen && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal card */}
          <div className="relative z-10 w-full max-w-sm modal-enter
            bg-white dark:bg-[#161a26]
            rounded-2xl shadow-2xl
            border border-slate-100 dark:border-white/[0.09]
            overflow-hidden">

            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5
              border-b border-slate-100 dark:border-white/[0.07]">
              <div>
                <h3 className="text-[15px] font-bold text-slate-800 dark:text-white">
                  Seat Table {selectedTable.table_number}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {selectedTable.capacity}-seat capacity
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center
                  text-slate-400 text-[14px] font-bold
                  hover:bg-slate-100 dark:hover:bg-white/[0.07]
                  hover:text-slate-600 dark:hover:text-slate-300
                  transition-all"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAllocate} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.1em]
                  text-slate-500 dark:text-slate-500 mb-1.5">
                  Customer Name
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Enter customer's name"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="premium-input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.1em]
                  text-slate-500 dark:text-slate-500 mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    placeholder="10-digit mobile number"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="premium-input pl-10"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold
                    text-slate-500 dark:text-slate-400
                    bg-slate-100 dark:bg-white/[0.05]
                    hover:bg-slate-200 dark:hover:bg-white/[0.08]
                    border border-slate-200 dark:border-white/[0.07]
                    transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg text-[13px] font-bold text-white
                    bg-emerald-500 hover:bg-emerald-600
                    active:scale-[0.98] transition-all
                    shadow-lg shadow-emerald-500/20
                    flex items-center justify-center gap-2"
                >
                  <CheckCircle size={14} />
                  Confirm & Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorGrid;
