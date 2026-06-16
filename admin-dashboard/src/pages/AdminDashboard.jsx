import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, IndianRupee, ClipboardList, Grid3X3, Users,
  ArrowUpRight, Flame, Clock, RefreshCcw, Circle,
  ChevronRight, AlertCircle, BarChart3
} from 'lucide-react';

/* ─── Animation Variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 18 } },
};
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

/* ─── Shimmer Loading ─── */
const Skeleton = ({ w, h, r = 8 }) => (
  <div
    className="shimmer-skeleton"
    style={{ width: w || '100%', height: h || '1rem', borderRadius: r, flexShrink: 0 }}
  />
);

const LoadingShell = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
    {/* Header */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Skeleton w="180px" h="1.6rem" />
        <Skeleton w="280px" h="0.75rem" />
      </div>
      <Skeleton w="120px" h="2.1rem" r={8} />
    </div>
    {/* KPI Row */}
    <div className="dashboard-grid">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            <Skeleton w="60%" h="0.7rem" />
            <Skeleton w="80%" h="1.6rem" />
            <Skeleton w="50%" h="0.6rem" />
          </div>
          <Skeleton w="44px" h="44px" r={10} />
        </div>
      ))}
    </div>
    {/* Chart panels */}
    <div className="analytics-panel">
      <div className="glass-card" style={{ height: '18rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Skeleton w="40%" h="1rem" />
        <Skeleton w="100%" h="100%" r={10} />
      </div>
      <div className="glass-card" style={{ height: '18rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Skeleton w="40%" h="1rem" />
        <Skeleton w="100%" h="100%" r={10} />
      </div>
    </div>
  </div>
);

/* ─── Main Component ─── */
const AdminDashboard = () => {
  const { apiFetch } = useAuth();
  const socket = useSocket();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [staff, setStaff] = useState([]);
  const [performance, setPerformance] = useState({
    waiters: [],
    kitchen: [],
    weeklySalesTrend: [0, 0, 0, 0, 0, 0, 0],
  });
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const retryTimeoutRef = React.useRef(null);

  /* Fetch all dashboard data */
  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    // Keep loading skeleton active on fetch failures

    try {
      const [tablesData, activeOrdersData, staffData, perfData] = await Promise.all([
        apiFetch('/tables'),
        apiFetch('/orders/active'),
        apiFetch('/staff'),
        apiFetch('/staff/performance'),
      ]);

      setTables(Array.isArray(tablesData) ? tablesData : []);
      setActiveOrders(Array.isArray(activeOrdersData) ? activeOrdersData : []);
      setStaff(Array.isArray(staffData) ? staffData : []);
      setPerformance(
        perfData && Array.isArray(perfData.waiters)
          ? perfData
          : { waiters: [], kitchen: [], weeklySalesTrend: [0, 0, 0, 0, 0, 0, 0] }
      );
      setError(null);
      setLastRefreshed(new Date());
      setLoading(false); // Success! Hide loading skeleton
      setRefreshing(false);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data. Retrying connection to backend...');
      setLoading(true); // Retain loading shell when backend is offline
      setRefreshing(false);
      
      // Auto-retry in 3 seconds to check if backend came online
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(() => fetchData(isManual), 3000);
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  /* Live socket refresh */
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchData();
    socket.on('table-update', refresh);
    socket.on('order-update', refresh);
    socket.on('new-order', refresh);
    socket.on('payment-success', refresh);
    return () => {
      socket.off('table-update', refresh);
      socket.off('order-update', refresh);
      socket.off('new-order', refresh);
      socket.off('payment-success', refresh);
    };
  }, [socket]);

  /* ─── Derived Metrics ─── */
  const waitersList = Array.isArray(performance.waiters) ? performance.waiters : [];
  const totalRevenue = waitersList.reduce((s, w) => s + parseFloat(w.total_revenue || 0), 0);

  const tableList = Array.isArray(tables) ? tables : [];
  const totalTables = tableList.length;
  const availableTables = tableList.filter(t => t.status === 'available').length;
  const occupiedTables = totalTables - availableTables;

  const staffList = Array.isArray(staff) ? staff : [];
  const presentStaff = staffList.filter(s => s.attendance_status === 'clocked_in').length;

  const orderList = Array.isArray(activeOrders) ? activeOrders : [];
  const pendingCount = orderList.filter(o => o.status === 'pending').length;
  const cookingCount = orderList.filter(o => o.status === 'cooking').length;
  const readyCount = orderList.filter(o => o.status === 'ready').length;

  /* ─── SVG Revenue Chart ─── */
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklySales = Array.isArray(performance.weeklySalesTrend)
    ? performance.weeklySalesTrend.map(v => parseFloat(v || 0))
    : [0, 0, 0, 0, 0, 0, 0];

  const chartH = 140;
  const chartW = 500;
  const maxVal = Math.max(...weeklySales);
  const minVal = Math.min(...weeklySales);
  const scaleMax = maxVal > 0 ? maxVal * 1.2 : 1000;
  const scaleMin = minVal > 0 ? minVal * 0.8 : 0;

  const getX = i => i * (chartW / (days.length - 1));
  const getY = v => {
    if (scaleMax === scaleMin) return chartH;
    return chartH - ((v - scaleMin) / (scaleMax - scaleMin)) * chartH;
  };

  const pts = weeklySales.map((v, i) => ({ x: getX(i), y: getY(v) }));

  const linePath = pts.length > 1
    ? `M ${pts[0].x} ${pts[0].y} ` +
      pts.slice(1).map((p, i) => {
        const prev = pts[i];
        const cx1 = prev.x + (p.x - prev.x) * 0.5;
        const cy1 = prev.y;
        const cx2 = prev.x + (p.x - prev.x) * 0.5;
        const cy2 = p.y;
        return `C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`;
      }).join(' ')
    : '';

  const areaPath = linePath
    ? `${linePath} L ${pts[pts.length - 1].x} ${chartH} L ${pts[0].x} ${chartH} Z`
    : '';

  // Peak day
  let peakIdx = 0;
  let peakVal = weeklySales[0] || 0;
  weeklySales.forEach((v, i) => { if (v > peakVal) { peakVal = v; peakIdx = i; } });

  if (loading) return <LoadingShell />;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      {/* ═══ PAGE HEADER ═══ */}
      <motion.div
        variants={fadeUp}
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}
      >
        <div>
          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '1.4rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            lineHeight: 1.2,
          }}>
            Overview Analytics
          </h1>
          <p style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            marginTop: '0.3rem',
            fontWeight: 400,
          }}>
            Real-time indicators, revenue insights, and operational metrics
            {lastRefreshed && (
              <span style={{ marginLeft: '0.5rem', color: 'var(--success)', fontWeight: 600 }}>
                · Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>

        <motion.button
          onClick={() => fetchData(true)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          disabled={refreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.1rem',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            cursor: refreshing ? 'wait' : 'pointer',
            fontFamily: "'Inter', sans-serif",
            transition: 'all 0.18s ease',
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          <motion.div
            animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 0.7, repeat: refreshing ? Infinity : 0, ease: 'linear' }}
          >
            <RefreshCcw size={13} />
          </motion.div>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </motion.button>
      </motion.div>

      {/* ═══ ERROR BANNER ═══ */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              borderRadius: 10,
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--danger)',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ KPI GRID ═══ */}
      <motion.div variants={stagger} className="dashboard-grid">
        {/* Revenue */}
        <motion.div variants={fadeUp} className="kpi-card kpi-card-green" whileHover={{ y: -3 }}>
          <div className="kpi-left">
            <span className="kpi-label">Total Revenue</span>
            <span className="kpi-value">
              ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="kpi-meta kpi-meta-positive">
              <ArrowUpRight size={11} />
              From paid orders
            </span>
          </div>
          <div className="kpi-icon-wrap kpi-icon-green">
            <IndianRupee size={20} />
          </div>
        </motion.div>

        {/* Active Orders */}
        <motion.div variants={fadeUp} className="kpi-card kpi-card-blue" whileHover={{ y: -3 }}>
          <div className="kpi-left">
            <span className="kpi-label">Active Orders</span>
            <span className="kpi-value">{orderList.length}</span>
            <div className="kpi-meta" style={{ gap: '0.5rem' }}>
              {pendingCount > 0 && (
                <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{pendingCount} pending</span>
              )}
              {cookingCount > 0 && (
                <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{cookingCount} cooking</span>
              )}
              {readyCount > 0 && (
                <span style={{ color: 'var(--info)', fontWeight: 700 }}>{readyCount} ready</span>
              )}
              {orderList.length === 0 && (
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>All clear 🎉</span>
              )}
            </div>
          </div>
          <div className="kpi-icon-wrap kpi-icon-blue">
            <ClipboardList size={20} />
          </div>
        </motion.div>

        {/* Tables */}
        <motion.div variants={fadeUp} className="kpi-card kpi-card-red" whileHover={{ y: -3 }}>
          <div className="kpi-left">
            <span className="kpi-label">Table Occupancy</span>
            <span className="kpi-value">{occupiedTables}<span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: 4 }}>/ {totalTables}</span></span>
            <span className="kpi-meta kpi-meta-warning">
              <Circle size={8} style={{ fill: 'currentColor' }} />
              {availableTables} available right now
            </span>
          </div>
          <div className="kpi-icon-wrap kpi-icon-red">
            <Grid3X3 size={20} />
          </div>
        </motion.div>

        {/* Staff */}
        <motion.div variants={fadeUp} className="kpi-card kpi-card-purple" whileHover={{ y: -3 }}>
          <div className="kpi-left">
            <span className="kpi-label">Staff Present</span>
            <span className="kpi-value">{presentStaff}<span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: 4 }}>/ {staffList.length}</span></span>
            <span className="kpi-meta" style={{ color: 'var(--purple)' }}>
              <Clock size={10} />
              Clocked in now
            </span>
          </div>
          <div className="kpi-icon-wrap kpi-icon-purple">
            <Users size={20} />
          </div>
        </motion.div>
      </motion.div>

      {/* ═══ ANALYTICS PANELS ═══ */}
      <div className="analytics-panel">

        {/* Revenue Chart */}
        <motion.div
          variants={fadeUp}
          className="glass-card"
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 1.5rem' }}
        >
          {/* Chart Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--brand-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <BarChart3 size={15} style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <h3 className="section-title" style={{ fontSize: '0.88rem' }}>Revenue Trend</h3>
                <p style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: 1 }}>This week's daily sales</p>
              </div>
            </div>
            <span style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              color: 'var(--brand)',
              background: 'var(--brand-light)',
              padding: '0.2rem 0.6rem',
              borderRadius: 999,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              border: '1px solid var(--danger-border)',
            }}>
              Weekly
            </span>
          </div>

          {/* Chart Canvas */}
          <div style={{
            background: 'var(--bg-app)',
            borderRadius: 10,
            border: '1px solid var(--border)',
            padding: '1rem 0.75rem 0.5rem',
            position: 'relative',
          }}>
            <svg
              viewBox={`0 0 ${chartW} ${chartH + 20}`}
              style={{ width: '100%', height: '10rem', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0.25, 0.5, 0.75].map(r => (
                <line
                  key={r}
                  x1="0" y1={chartH * r} x2={chartW} y2={chartH * r}
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              ))}

              {/* Area fill */}
              {areaPath && (
                <motion.path
                  d={areaPath}
                  fill="url(#chartFill)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1 }}
                />
              )}

              {/* Line */}
              {linePath && (
                <motion.path
                  d={linePath}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.4, ease: 'easeOut' }}
                />
              )}

              {/* Data points */}
              {pts.map((p, i) => (
                <motion.circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  fill="#ef4444"
                  stroke="var(--bg-surface)"
                  strokeWidth="2"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8 + i * 0.06, type: 'spring', stiffness: 300 }}
                  whileHover={{ r: 8, fill: '#f97316' }}
                  style={{ cursor: 'pointer' }}
                />
              ))}

              {/* Day labels */}
              {days.map((day, i) => (
                <text
                  key={day}
                  x={getX(i)}
                  y={chartH + 18}
                  textAnchor="middle"
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: i === peakIdx ? 800 : 600,
                    fill: i === peakIdx ? '#ef4444' : 'var(--text-muted)',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {day}
                </text>
              ))}
            </svg>
          </div>

          {/* Chart Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
          }}>
            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Flame size={11} style={{ color: 'var(--brand)' }} />
              Peak: {days[peakIdx]}
              {peakVal > 0 && ` · ₹${(peakVal / 1000).toFixed(1)}k`}
            </span>
            <span style={{ fontWeight: 500 }}>
              This week · {weeklySales.some(v => v > 0) ? `₹${(weeklySales.reduce((a, b) => a + b, 0) / 1000).toFixed(1)}k total` : 'No paid orders yet'}
            </span>
          </div>
        </motion.div>

        {/* Table Status Overview */}
        <motion.div
          variants={fadeUp}
          className="glass-card"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', padding: '1.25rem 1.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--warning-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Grid3X3 size={15} style={{ color: 'var(--warning)' }} />
              </div>
              <div>
                <h3 className="section-title" style={{ fontSize: '0.88rem' }}>Floor View</h3>
                <p style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: 1 }}>Table occupancy status</p>
              </div>
            </div>
            <span style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              color: 'var(--warning)',
              background: 'var(--warning-bg)',
              padding: '0.2rem 0.6rem',
              borderRadius: 999,
              border: '1px solid var(--warning-border)',
            }}>
              {occupiedTables} Occupied
            </span>
          </div>

          {/* Table list */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tables.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                No tables configured yet.
              </div>
            ) : (
              tables.slice(0, 7).map(table => (
                <div
                  key={table.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.625rem 0.75rem',
                    borderRadius: 8,
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.background = 'var(--brand-light)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-app)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: table.status === 'available' ? 'var(--success-bg)' : table.status === 'cooking' ? 'var(--warning-bg)' : table.status === 'ready' ? 'var(--info-bg)' : 'var(--danger-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: table.status === 'available' ? 'var(--success)' : table.status === 'cooking' ? 'var(--warning)' : table.status === 'ready' ? 'var(--info)' : 'var(--danger)',
                    }}>
                      T{table.table_number}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Table {table.table_number}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                        {table.capacity} seats
                      </div>
                    </div>
                  </div>
                  <span className={`status-badge ${
                    table.status === 'available' ? 'status-available' :
                    table.status === 'cooking' ? 'status-cooking' :
                    table.status === 'ready' ? 'status-ready' : 'status-occupied'
                  }`} style={{ fontSize: '0.6rem' }}>
                    {table.status}
                  </span>
                </div>
              ))
            )}
          </div>

          <a
            href="/tables"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--brand)',
              textDecoration: 'none',
              padding: '0.5rem',
              borderRadius: 8,
              border: '1px solid var(--danger-border)',
              background: 'var(--brand-light)',
              transition: 'all 0.15s ease',
              marginTop: 'auto',
            }}
          >
            Manage All Tables <ChevronRight size={13} />
          </a>
        </motion.div>
      </div>

      {/* ═══ PERFORMANCE PANELS ═══ */}
      <div className="analytics-panel" style={{ gridTemplateColumns: '1fr 1fr' }}>

        {/* Waiter Performance */}
        <motion.div
          variants={fadeUp}
          className="glass-card"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', padding: '1.25rem 1.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--info-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingUp size={15} style={{ color: 'var(--info)' }} />
            </div>
            <div>
              <h3 className="section-title" style={{ fontSize: '0.88rem' }}>Waiter Sales</h3>
              <p style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: 1 }}>Revenue by server</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {waitersList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                No waiter performance data yet.
              </div>
            ) : (
              waitersList.map(waiter => {
                const pct = totalRevenue > 0 ? (parseFloat(waiter.total_revenue) / totalRevenue) * 100 : 0;
                return (
                  <div key={waiter.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.77rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: 6,
                          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 800, fontSize: '0.68rem',
                        }}>
                          {waiter.name?.charAt(0)}
                        </div>
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{waiter.name}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                            {waiter.total_orders} orders
                          </span>
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        ₹{parseFloat(waiter.total_revenue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="progress-bar-track">
                      <motion.div
                        className="progress-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(pct, 3)}%` }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                        style={{
                          background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Kitchen KPI */}
        <motion.div
          variants={fadeUp}
          className="glass-card"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', padding: '1.25rem 1.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--warning-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Flame size={15} style={{ color: 'var(--warning)' }} />
            </div>
            <div>
              <h3 className="section-title" style={{ fontSize: '0.88rem' }}>Kitchen KPI</h3>
              <p style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: 1 }}>Chefs & completions</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {performance.kitchen.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                No kitchen staff data yet.
              </div>
            ) : (
              performance.kitchen.map(chef => (
                <div
                  key={chef.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.625rem 0.75rem',
                    borderRadius: 8,
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: 'var(--warning-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Flame size={14} style={{ color: 'var(--warning)' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {chef.name}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        Shift: {chef.shift_timing}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {chef.completed_orders}
                    </div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Completed
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
};

export default AdminDashboard;
