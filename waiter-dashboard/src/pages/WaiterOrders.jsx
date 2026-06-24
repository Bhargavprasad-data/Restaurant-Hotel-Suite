import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Clock, User, Phone, Check, CreditCard, RefreshCw,
  ClipboardList, AlertCircle, Hourglass, Flame, Utensils, CheckCircle2
} from 'lucide-react';

/* ── Kanban column config ── */
const COLUMNS = [
  {
    key: 'pending',
    label: 'Pending',
    emoji: <Hourglass size={16} strokeWidth={2.5} className="text-yellow-500" />,
    colClass: 'col-pending',
    pillClass: 'pill-pending',
    dotClass: 'bg-yellow-400',
    accentColor: '#eab308',
    description: 'Awaiting kitchen confirmation',
  },
  {
    key: 'cooking',
    label: 'Cooking',
    emoji: <Flame size={16} strokeWidth={2.5} className="text-orange-500" />,
    colClass: 'col-cooking',
    pillClass: 'pill-cooking',
    dotClass: 'bg-orange-500 dot-pulse',
    accentColor: '#f97316',
    description: 'Chef is preparing the order',
  },
  {
    key: 'ready',
    label: 'Ready',
    emoji: <Utensils size={16} strokeWidth={2.5} className="text-blue-500" />,
    colClass: 'col-ready',
    pillClass: 'pill-ready',
    dotClass: 'bg-blue-500 dot-pulse',
    accentColor: '#3b82f6',
    description: 'Food ready — serve immediately',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    emoji: <CheckCircle2 size={16} strokeWidth={2.5} className="text-emerald-500" />,
    colClass: 'col-delivered',
    pillClass: 'pill-delivered',
    dotClass: 'bg-slate-400',
    accentColor: '#64748b',
    description: 'Served, awaiting payment',
  },
];

/* ── Time elapsed helper ── */
const timeAgo = (isoStr) => {
  const diff = Math.floor((Date.now() - new Date(isoStr)) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

/* ─────────────────────────────────────── */

const WaiterOrders = () => {
  const { apiFetch } = useAuth();
  const socket = useSocket();

  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tick, setTick]       = useState(0); // live clock for time-ago
  const [activeTab, setActiveTab] = useState('all');

  const [whatsappModal, setWhatsappModal] = useState({
    isOpen: false,
    loading: false,
    success: false,
    mock: false,
    error: null,
    order: null,
  });

  const triggerWhatsAppSend = async (order) => {
    setWhatsappModal({
      isOpen: true,
      loading: true,
      success: false,
      mock: false,
      error: null,
      order: order,
    });

    try {
      const res = await apiFetch(`/orders/${order.id}/send-whatsapp`, {
        method: 'POST',
      });
      
      if (res.mock) {
        setWhatsappModal({
          isOpen: true,
          loading: false,
          success: true,
          mock: true,
          error: res.error || null,
          order: order,
        });
      } else {
        setWhatsappModal({
          isOpen: true,
          loading: false,
          success: true,
          mock: false,
          error: null,
          order: order,
        });
      }
    } catch (err) {
      setWhatsappModal({
        isOpen: true,
        loading: false,
        success: false,
        mock: false,
        error: err.message || 'Connection to server failed',
        order: order,
      });
    }
  };

  const getManualWhatsAppUrl = (order) => {
    if (!order) return '';
    let phone = order.customer_phone.trim();
    if (!phone.startsWith('+')) {
      if (phone.length === 10) {
        phone = `91${phone}`;
      }
    } else {
      phone = phone.replace('+', '');
    }

    const checkoutUrl = `${window.location.origin}/checkout/simulated?order_id=${order.id}&razorpay_order_id=${order.razorpay_order_id}&amount=${order.grand_total}`;
    const message = `Hello ${order.customer_name}! 🍽️\n\nThank you for dining with us at Tasty Bites. Your bill for Table ${order.table_number} is generated.\n\n💵 *Total Amount:* ₹${parseFloat(order.grand_total).toFixed(2)}\n🔗 *Secure Payment Link:* ${checkoutUrl}\n\nPlease click the link above to complete your online payment. Once completed, a green receipt will be generated automatically for your checkout exit pass!\n\nWe hope to serve you again soon! ⭐`;

    const encodedText = encodeURIComponent(message);
    return `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;
  };

  const retryTimeoutRef = React.useRef(null);

  // Live clock tick (re-renders time-ago every 30s)
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 30000);
    return () => clearInterval(t);
  }, []);

  /* ── Fetch with auto-retry ── */
  const fetchOrders = async () => {
    try {
      const data = await apiFetch('/orders/active');
      setOrders(data);
      setError(null);
      setLoading(false);
    } catch (err) {
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

    const handleOrderUpdate = (updated) => {
      setOrders(prev => {
        if (updated.status === 'paid') return prev.filter(o => o.id !== updated.id);
        const exists = prev.find(o => o.id === updated.id);
        return exists
          ? prev.map(o => o.id === updated.id ? updated : o)
          : [updated, ...prev];
      });
    };

    const handleNewOrder = (newOrder) => {
      setOrders(prev => prev.find(o => o.id === newOrder.id) ? prev : [newOrder, ...prev]);
    };

    socket.on('order-update', handleOrderUpdate);
    socket.on('new-order', handleNewOrder);
    return () => {
      socket.off('order-update', handleOrderUpdate);
      socket.off('new-order', handleNewOrder);
    };
  }, [socket]);

  /* ── Actions ── */
  const handleDeliver = async (orderId) => {
    try {
      await apiFetch(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'delivered' }),
      });
      // Socket will update state
    } catch (err) {
      alert(err.message || 'Failed to update order status.');
    }
  };

  const openPayment = (order) => {
    const path = `checkout/simulated?order_id=${order.id}&razorpay_order_id=${order.razorpay_order_id}&amount=${order.grand_total}`;
    window.open(`${window.location.origin}/${path}`, '_blank');
  };

  /* ══════════ SHIMMER LOADING ══════════ */
  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse-slow">
        <div className="space-y-1.5">
          <div className="shimmer-skeleton h-7 w-52 rounded-lg" />
          <div className="shimmer-skeleton h-3.5 w-36 rounded" />
        </div>

        {/* Kanban skeleton: 4 columns */}
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map(col => (
            <div
              key={col.key}
              className="flex-1 min-w-[240px] max-w-[300px] shrink-0
                bg-white dark:bg-[#111420]
                border border-slate-100 dark:border-white/[0.07]
                rounded-xl overflow-hidden"
            >
              {/* Column top bar */}
              <div className="h-[3px] w-full shimmer-skeleton" />
              <div className="p-4 space-y-3">
                <div className="shimmer-skeleton h-5 w-24 rounded-lg" />
                {[1, 2].map(i => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-slate-100 dark:border-white/[0.06] space-y-2"
                  >
                    <div className="flex gap-2">
                      <div className="shimmer-skeleton h-6 w-8 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <div className="shimmer-skeleton h-3.5 w-3/4 rounded" />
                        <div className="shimmer-skeleton h-3 w-1/2 rounded" />
                      </div>
                    </div>
                    <div className="shimmer-skeleton h-3 w-full rounded" />
                    <div className="shimmer-skeleton h-3 w-4/5 rounded" />
                    <div className="shimmer-skeleton h-7 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ══════════ MAIN VIEW ══════════ */
  const totalActive = orders.filter(o => o.status !== 'delivered').length;

  const filteredOrders = activeTab === 'all'
    ? orders
    : orders.filter(o => o.status === activeTab);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Page Header ── */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-4
        bg-white dark:bg-[#111420]
        border-b border-slate-100 dark:border-white/[0.07]">
        <div>
          <h1 className="text-[18px] font-bold text-slate-800 dark:text-white tracking-tight">
            Active Orders Board
          </h1>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400 dark:text-slate-600 mt-0.5">
            Real-time status · {totalActive} in progress
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-[11px] text-rose-400 font-medium">
            <RefreshCw size={12} className="animate-spin" />
            {error}
          </div>
        )}
      </div>

      {/* ── Sleek Horizontal Tab Selector ── */}
      <div className="shrink-0 px-6 py-3 bg-slate-50 dark:bg-[#0c0e17] border-b border-slate-100 dark:border-white/[0.05] flex gap-2 overflow-x-auto select-none no-scrollbar">
        {/* 'All' Tab */}
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all relative shrink-0 active:scale-95
            ${activeTab === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
            }`}
        >
          <span className="flex items-center shrink-0">
            <ClipboardList
              size={16}
              strokeWidth={2.5}
              className={activeTab === 'all' ? 'text-white dark:text-slate-950' : 'text-slate-500 dark:text-slate-400'}
            />
          </span>
          <span>All Orders</span>
          <span
            className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center border
              ${activeTab === 'all'
                ? 'bg-emerald-500 text-white border-emerald-400'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent'
              }`}
          >
            {orders.length}
          </span>
        </button>

        {COLUMNS.map(col => {
          const count = orders.filter(o => o.status === col.key).length;
          const isActive = activeTab === col.key;
          return (
            <button
              key={col.key}
              onClick={() => setActiveTab(col.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all relative shrink-0 active:scale-95
                ${isActive
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
            >
              <span className="flex items-center shrink-0">{col.emoji}</span>
              <span>{col.label}</span>
              <span
                className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center border
                  ${isActive
                    ? 'bg-emerald-500 text-white border-emerald-400'
                    : count > 0
                      ? 'bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent'
                  }`}
              >
                {count}
              </span>
              
              {/* Highlight dot if there are any urgent ready orders */}
              {col.key === 'ready' && count > 0 && !isActive && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Spacious Full-Width Grid View ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4 py-20">
            <ClipboardList size={48} className="text-slate-200 dark:text-slate-800" />
            <div className="text-center">
              <p className="text-[15px] font-semibold text-slate-500 dark:text-slate-600">No active orders</p>
              <p className="text-[12px] text-slate-400 dark:text-slate-700 mt-1">
                There are currently no orders in the "{activeTab === 'all' ? 'active' : activeTab}" stage.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredOrders.map(order => {
              const col = COLUMNS.find(c => c.key === order.status) || COLUMNS[0];
              return (
                <OrderCard
                  key={order.id}
                  order={order}
                  col={col}
                  onDeliver={handleDeliver}
                  onPayment={openPayment}
                  onSendWhatsApp={triggerWhatsAppSend}
                  tick={tick}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── WhatsApp Status / Fallback Modal ── */}
      {whatsappModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#111420] border border-slate-100 dark:border-white/[0.08] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-in">
            
            {/* Loading state */}
            {whatsappModal.loading && (
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-center">
                  <h3 className="text-md font-bold text-slate-800 dark:text-white">Sending WhatsApp Bill</h3>
                  <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                    Contacting Twilio API to dispatch bill to {whatsappModal.order?.customer_phone}...
                  </p>
                </div>
              </div>
            )}

            {/* Success production state */}
            {whatsappModal.success && !whatsappModal.mock && (
              <div className="flex flex-col items-center justify-center py-4 space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-md shadow-emerald-500/10">
                  <Check size={24} strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-md font-bold text-slate-800 dark:text-white">Bill Dispatched Automatically!</h3>
                  <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                    The WhatsApp bill was successfully dispatched via Twilio to <strong>{whatsappModal.order?.customer_phone}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => setWhatsappModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-[12px] transition-all shadow-md shadow-emerald-500/20"
                >
                  Done
                </button>
              </div>
            )}

            {/* Sandbox/Simulator mode state */}
            {whatsappModal.success && whatsappModal.mock && (
              <div className="space-y-4 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-md shadow-amber-500/10">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="text-md font-bold text-slate-800 dark:text-white">Twilio Sandbox Mode Triggered</h3>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-medium">
                    We dispatched the WhatsApp bill simulated logs on the backend successfully!
                  </p>
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/[0.05] border border-amber-500/[0.15] text-[11px] text-slate-600 dark:text-slate-400 text-left space-y-1">
                    <p className="font-semibold text-amber-600 dark:text-amber-400">💡 Testing with a real number?</p>
                    <p>For WhatsApp Sandbox to deliver, your recipient's phone must first text <strong>join standard-choice</strong> (or your sandbox keyword) to <strong>+14155238886</strong> on WhatsApp.</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      const url = getManualWhatsAppUrl(whatsappModal.order);
                      window.open(url, '_blank');
                      setWhatsappModal(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-[12px] transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                  >
                    💬 Send via WhatsApp Web (Fallback)
                  </button>
                  <button
                    onClick={() => setWhatsappModal(prev => ({ ...prev, isOpen: false }))}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-slate-600 dark:text-slate-300 font-bold rounded-xl text-[12px] transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Error state */}
            {whatsappModal.error && (
              <div className="space-y-4 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-md shadow-rose-500/10">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-md font-bold text-slate-800 dark:text-white">Automated Send Failed</h3>
                  <p className="text-[12px] text-rose-500 mt-1 font-semibold text-center break-words">
                    {whatsappModal.error}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 leading-relaxed font-medium">
                    Don't worry! You can still send the bill manually using the WhatsApp Web/App pre-filled text shortcut.
                  </p>
                </div>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      const url = getManualWhatsAppUrl(whatsappModal.order);
                      window.open(url, '_blank');
                      setWhatsappModal(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-[12px] transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                  >
                    💬 Send via WhatsApp Web (Manual Link)
                  </button>
                  <button
                    onClick={() => setWhatsappModal(prev => ({ ...prev, isOpen: false }))}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-slate-600 dark:text-slate-300 font-bold rounded-xl text-[12px] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

/* ── Individual order card ── */
const OrderCard = ({ order, col, onDeliver, onPayment, onSendWhatsApp }) => {
  const isReady     = order.status === 'ready';
  const isDelivered = order.status === 'delivered';

  return (
    <div
      className={`order-card fade-in-up ${isReady ? 'glow-blue' : ''}`}
      style={isReady ? { borderColor: 'rgba(59,130,246,0.3)' } : {}}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Table badge */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-black shrink-0"
            style={{ background: `${col.accentColor}18`, color: col.accentColor }}
          >
            {order.table_number}
          </div>
          <div>
            <div className="flex items-center gap-1 text-[12px] font-bold text-slate-800 dark:text-slate-100">
              <User size={11} className="text-slate-400" />
              <span className="truncate max-w-[100px]">{order.customer_name}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
              <Phone size={9} />
              <span>{order.customer_phone}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
          <Clock size={10} />
          <span>{timeAgo(order.created_at)}</span>
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-1 py-1 border-y border-slate-100 dark:border-white/[0.05]">
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600">
          Items ({order.items?.length || 0})
        </div>
        {order.items?.slice(0, 3).map((item, idx) => (
          <div key={idx} className="flex justify-between text-[11px]">
            <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
              {item.menu_item_name}
              <span className="text-slate-400 dark:text-slate-600"> ×{item.quantity}</span>
            </span>
            <span className="text-slate-500 dark:text-slate-500 tabular-nums shrink-0">
              ₹{(item.price * item.quantity).toFixed(0)}
            </span>
          </div>
        ))}
        {(order.items?.length || 0) > 3 && (
          <div className="text-[10px] text-slate-400 dark:text-slate-600">
            +{order.items.length - 3} more items
          </div>
        )}
      </div>

      {/* Action buttons */}
      {isReady && (
        <button
          onClick={() => onDeliver(order.id)}
          className="w-full py-2 rounded-lg text-[11px] font-bold text-white
            bg-blue-500 hover:bg-blue-600
            active:scale-[0.98] transition-all
            shadow-md shadow-blue-500/20
            flex items-center justify-center gap-1.5"
        >
          <Check size={13} />
          Confirm Delivery
        </button>
      )}

      {isDelivered && (
        <div className="space-y-2">
          {/* Billing summary */}
          <div className="p-2.5 rounded-lg space-y-1.5
            bg-emerald-500/[0.05] border border-emerald-500/[0.15]">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                ₹{parseFloat(order.total_amount).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">GST (5%)</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                ₹{parseFloat(order.tax_amount).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-[12px] font-black pt-1
              border-t border-emerald-500/20">
              <span className="text-slate-700 dark:text-slate-200">Grand Total</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                ₹{parseFloat(order.grand_total).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Whatsapp notice / Share button */}
          <button
            onClick={() => onSendWhatsApp(order)}
            className="w-full py-1.5 rounded-lg text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-all border border-emerald-500/20 flex items-center justify-center gap-1.5"
            title="Send WhatsApp payment link"
          >
            <span>💬 Send Bill via WhatsApp</span>
          </button>

          {/* Payment link */}
          <button
            onClick={() => onPayment(order)}
            className="w-full py-2 rounded-lg text-[11px] font-bold text-white
              bg-emerald-500 hover:bg-emerald-600
              active:scale-[0.98] transition-all
              shadow-md shadow-emerald-500/20
              flex items-center justify-center gap-1.5"
          >
            <CreditCard size={12} />
            Open Payment Link
          </button>
        </div>
      )}
    </div>
  );
};

export default WaiterOrders;
