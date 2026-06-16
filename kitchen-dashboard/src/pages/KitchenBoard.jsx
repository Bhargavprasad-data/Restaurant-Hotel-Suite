import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Clock, Flame, CheckCircle2, Play, Check, ClipboardList, AlertCircle, Hourglass } from 'lucide-react';

/* ── Kanban column config ── */
const COLUMNS = [
  {
    key: 'pending',
    label: 'Pending',
    icon: <Hourglass size={14} strokeWidth={2.5} className="text-rose-400" />,
    accentColor: '#ef4444',
    colClass: 'col-pending',
    description: 'New orders awaiting kitchen confirmation',
  },
  {
    key: 'cooking',
    label: 'Cooking',
    icon: <Flame size={14} strokeWidth={2.5} className="text-amber-400" />,
    accentColor: '#f59e0b',
    colClass: 'col-cooking',
    description: 'Chef is actively preparing',
  },
  {
    key: 'ready',
    label: 'Ready',
    icon: <CheckCircle2 size={14} strokeWidth={2.5} className="text-blue-400" />,
    accentColor: '#3b82f6',
    colClass: 'col-ready',
    description: 'Ready for runners — serve immediately',
  },
];

/* ── Time elapsed helper ── */
const timeAgo = (isoStr) => {
  const diff = Math.floor((Date.now() - new Date(isoStr)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

/* ── Skeleton card ── */
const CardSkeleton = ({ hasButton, hasBadge }) => (
  <div className="order-card space-y-3">
    <div className="flex justify-between items-start pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <div>
        <div className="flex items-center gap-1.5">
          <div className="shimmer-skeleton h-3 w-8 rounded" />
          <div className="shimmer-skeleton h-6 w-6 rounded-lg" />
          {hasBadge && <div className="shimmer-skeleton h-4 w-10 rounded" />}
        </div>
        <div className="shimmer-skeleton h-3 w-28 rounded mt-2" />
      </div>
      <div className="shimmer-skeleton h-3 w-12 rounded" />
    </div>
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="shimmer-skeleton h-3.5 w-3.5 rounded" />
        <div className="shimmer-skeleton h-3 w-36 rounded" />
      </div>
      <div className="flex items-center gap-2">
        <div className="shimmer-skeleton h-3.5 w-3.5 rounded" />
        <div className="shimmer-skeleton h-3 w-24 rounded" />
      </div>
    </div>
    {hasButton && <div className="shimmer-skeleton h-9 w-full rounded-lg mt-1" />}
  </div>
);

/* ═══════════════════════════════════════ */

const KitchenBoard = () => {
  const { apiFetch } = useAuth();
  const socket = useSocket();

  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tick, setTick]       = useState(0);
  const [isOnline, setIsOnline] = useState(!!socket);

  useEffect(() => {
    setIsOnline(!!socket);
  }, [socket]);

  const retryTimeoutRef = React.useRef(null);

  // Live clock tick (re-renders time-ago every 10s)
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 10000);
    return () => clearInterval(t);
  }, []);

  /* ── Fetch with auto-retry ── */
  const fetchOrders = async () => {
    try {
      const data = await apiFetch('/orders/active');
      setOrders(data.filter(o => ['pending', 'cooking', 'ready'].includes(o.status)));
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Kitchen fetch error:', err);
      setError(err.message || 'Cannot reach backend. Retrying…');
      setLoading(true); // Retain loading shell when backend is offline
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(fetchOrders, 3000);
    }
  };

  useEffect(() => {
    fetchOrders();
    return () => { if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current); };
  }, []);

  /* ── Socket updates ── */
  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (newOrder) => {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
        audio.volume = 0.5;
        audio.play();
      } catch { console.log('Audio blocked by browser'); }

      setOrders(prev => prev.find(o => o.id === newOrder.id) ? prev : [newOrder, ...prev]);
    };

    const handleOrderUpdate = (updated) => {
      setOrders(prev => {
        if (['delivered', 'paid'].includes(updated.status)) return prev.filter(o => o.id !== updated.id);
        const exists = prev.find(o => o.id === updated.id);
        return exists
          ? prev.map(o => o.id === updated.id ? updated : o)
          : [updated, ...prev];
      });
    };

    socket.on('new-order', handleNewOrder);
    socket.on('order-update', handleOrderUpdate);
    return () => {
      socket.off('new-order', handleNewOrder);
      socket.off('order-update', handleOrderUpdate);
    };
  }, [socket]);

  /* ── Actions ── */
  const handleUpdateStatus = async (orderId, nextStatus) => {
    try {
      await apiFetch(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (err) {
      alert(err.message || 'Failed to update order state.');
    }
  };

  /* ══════════ SHIMMER LOADING ══════════ */
  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-6 py-4">
          <div className="space-y-1.5">
            <div className="shimmer-skeleton h-7 w-48 rounded-lg" />
            <div className="shimmer-skeleton h-3 w-32 rounded" />
          </div>
          <div className="shimmer-skeleton h-8 w-36 rounded-lg" />
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 px-6 pb-6 overflow-hidden animate-pulse-slow">
          {COLUMNS.map(col => (
            <div key={col.key} className="surface-card flex flex-col overflow-hidden">
              <div className={`h-[3px] w-full ${col.colClass}`} />
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="shimmer-skeleton h-4 w-4 rounded" />
                  <div className="shimmer-skeleton h-4 w-28 rounded" />
                </div>
                <CardSkeleton hasButton={col.key !== 'ready'} hasBadge={col.key === 'ready'} />
                <CardSkeleton hasButton={col.key !== 'ready'} hasBadge={col.key === 'ready'} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ══════════ MAIN VIEW ══════════ */
  const totalActive = orders.filter(o => o.status !== 'ready').length;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Page Header ── */}
      <div
        className="shrink-0 flex items-center justify-between gap-4 px-6 py-4 border-b"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div>
          <h1 className="text-[18px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Kitchen Operations
          </h1>
          <p
            className="text-[11px] font-medium uppercase tracking-[0.1em] mt-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            Real-time queue · {totalActive} in progress
          </p>
        </div>

        <div className="flex items-center gap-3">
          {error && (
            <div className="flex items-center gap-2 text-[11px] text-rose-400 font-medium">
              <AlertCircle size={12} />
              <span className="hidden sm:inline">{error}</span>
            </div>
          )}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all duration-300 ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/[0.06] dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/[0.06] dark:text-rose-400'
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]' : 'bg-rose-500 shadow-[0_0_6px_#ef4444]'
              }`}
            />
            <span>{isOnline ? 'System Live' : 'System Offline'}</span>
          </div>
        </div>
      </div>

      {/* ── Kanban Board ── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
            <ClipboardList size={48} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            <div className="text-center">
              <p className="text-[15px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                No active orders
              </p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Orders will appear here in real-time as waiters place them.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex gap-5 h-full" style={{ minWidth: 'max-content' }}>
            {COLUMNS.map(col => {
              const colOrders = orders.filter(o => o.status === col.key);
              return (
                <div
                  key={col.key}
                  className="flex flex-col w-[300px] shrink-0 h-full surface-card overflow-hidden"
                >
                  {/* Column top accent bar */}
                  <div className="h-[3px] w-full" style={{ background: col.accentColor }} />

                  {/* Column header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 shrink-0 border-b"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center gap-2">
                      {col.icon}
                      <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
                        {col.label}
                      </span>
                    </div>
                    <span
                      className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-black flex items-center justify-center"
                      style={{
                        background: colOrders.length ? `${col.accentColor}20` : 'rgba(100,116,139,0.1)',
                        color: colOrders.length ? col.accentColor : '#64748b',
                      }}
                    >
                      {colOrders.length}
                    </span>
                  </div>

                  {/* Column body — scrollable cards */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {colOrders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <ClipboardList size={22} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                        <p className="text-[11px] text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {col.description}
                        </p>
                      </div>
                    ) : (
                      colOrders.map(order => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          col={col}
                          onUpdateStatus={handleUpdateStatus}
                          tick={tick}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Individual order card ── */
const OrderCard = ({ order, col, onUpdateStatus }) => {
  const [checkedItems, setCheckedItems] = useState({});

  const toggleCheck = (itemId) => {
    setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const isPending = order.status === 'pending';
  const isCooking = order.status === 'cooking';
  const isReady   = order.status === 'ready';

  return (
    <div className="order-card fade-in-up">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Table</span>
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0"
              style={{ background: `${col.accentColor}18`, color: col.accentColor }}
            >
              {order.table_number}
            </div>
            {isReady && (
              <span
                className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider text-white"
                style={{ background: col.accentColor }}
              >
                Ready
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium block mt-1" style={{ color: 'var(--text-muted)' }}>
            Order for {order.customer_name}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>
          <Clock size={10} />
          <span>{timeAgo(order.created_at)}</span>
        </div>
      </div>

      {/* Items checklist */}
      <div className="space-y-1.5 py-1">
        <div
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          Items ({order.items?.length || 0})
        </div>
        {order.items?.map(item => (
          <label
            key={item.id}
            onClick={() => toggleCheck(item.id)}
            className="flex items-start gap-2 cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={!!checkedItems[item.id]}
              readOnly
              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 accent-amber-500"
            />
            <div className="flex-1">
              <span
                className={`text-[12px] font-semibold ${
                  checkedItems[item.id]
                    ? 'line-through'
                    : ''
                }`}
                style={{ color: checkedItems[item.id] ? 'var(--text-muted)' : 'var(--text-primary)' }}
              >
                {item.menu_item_name}{' '}
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>×{item.quantity}</span>
              </span>
              {item.special_notes && (
                <p className="text-[9px] font-bold italic mt-0.5" style={{ color: '#f59e0b' }}>
                  ✍️ Note: {item.special_notes}
                </p>
              )}
            </div>
          </label>
        ))}
      </div>

      {/* Action buttons */}
      {isPending && (
        <button
          onClick={() => onUpdateStatus(order.id, 'cooking')}
          className="w-full py-2.5 rounded-lg text-[11px] font-bold text-white
            bg-amber-500 hover:bg-amber-600
            active:scale-[0.98] transition-all
            shadow-md shadow-amber-500/20
            flex items-center justify-center gap-1.5 uppercase tracking-wide"
        >
          <Play size={12} />
          Start Preparing
        </button>
      )}

      {isCooking && (
        <button
          onClick={() => onUpdateStatus(order.id, 'ready')}
          className="w-full py-2.5 rounded-lg text-[11px] font-bold text-white
            bg-blue-500 hover:bg-blue-600
            active:scale-[0.98] transition-all
            shadow-md shadow-blue-500/20
            flex items-center justify-center gap-1.5 uppercase tracking-wide"
        >
          <Check size={12} />
          Mark Ready (Serve)
        </button>
      )}
    </div>
  );
};

export default KitchenBoard;
