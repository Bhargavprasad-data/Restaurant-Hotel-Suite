import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, ArrowLeft, Send,
  Tag, UtensilsCrossed,
} from 'lucide-react';

/* ── Category emoji map ── */
const CAT_EMOJI = {
  all: '🍽️', starter: '🥗', main: '🍛', dessert: '🍮', beverage: '🥤',
};

/* ────────────────────────────────── */

const OrderEntry = () => {
  const { table_id } = useParams();
  const { state }    = useLocation();
  const navigate     = useNavigate();
  const { apiFetch } = useAuth();
  const socket       = useSocket();

  // Redirect if no state
  useEffect(() => {
    if (!state || !state.customerName || !state.customerPhone) navigate('/');
  }, [state]);

  // Live socket updates for menu adjustments
  useEffect(() => {
    if (!socket) return;
    const handleMenuUpdate = (data) => {
      console.log('⚡ Real-time menu update detected:', data);
      loadMenu();
    };
    socket.on('menu-update', handleMenuUpdate);
    return () => {
      socket.off('menu-update', handleMenuUpdate);
    };
  }, [socket]);

  const [menu, setMenu]                   = useState([]);
  const [schedule, setSchedule]           = useState('all');
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [search, setSearch]               = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeOverride, setTimeOverride]   = useState('');
  const [cart, setCart]                   = useState([]);
  const [submitting, setSubmitting]       = useState(false);
  const [cartOpen, setCartOpen]           = useState(false); // mobile cart drawer

  const retryTimeoutRef = React.useRef(null);

  // Fetch menu
  const loadMenu = async () => {
    try {
      let url = '/menu?admin=false';
      if (timeOverride) url += `&timeOverride=${timeOverride}`;
      const data = await apiFetch(url);
      setMenu(data.menu);
      setSchedule(data.current_schedule);
      setError(null);
      setLoading(false); // Success! Hide skeleton
    } catch (err) {
      console.error('OrderEntry fetch error:', err);
      setError(err.message || 'Failed to load menu. Retrying connection to backend...');
      setLoading(true); // Retain loading shell when backend is offline
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(loadMenu, 3000);
    }
  };
  
  useEffect(() => {
    loadMenu();
    return () => { if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current); };
  }, [timeOverride]);

  /* ── Cart operations ── */
  const addToCart = (dish) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === dish.id);
      return exists
        ? prev.map(i => i.id === dish.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...dish, quantity: 1, specialNotes: '' }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev =>
      prev.map(i => i.id === id ? { ...i, quantity: i.quantity + delta } : i)
          .filter(i => i.quantity > 0)
    );
  };

  const updateNotes = (id, text) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, specialNotes: text } : i));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const cartTotal   = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount   = cart.reduce((s, i) => s + i.quantity, 0);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_name:  state.customerName,
          customer_phone: state.customerPhone,
          table_id:       parseInt(table_id),
          items: cart.map(i => ({
            menu_item_id:  i.id,
            quantity:      i.quantity,
            special_notes: i.specialNotes,
          })),
        }),
      });
      navigate('/orders');
    } catch (err) {
      setError(err.message || 'Failed to submit order.');
      setSubmitting(false);
    }
  };

  const categories  = ['all', 'starter', 'main', 'dessert', 'beverage'];
  const filteredMenu = menu.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q);
    const matchCat    = selectedCategory === 'all' || d.category === selectedCategory;
    return matchSearch && matchCat;
  });

  /* ══════════ Shared cart panel ══════════ */
  const CartPanel = () => (
    <div className="flex flex-col h-full">
      {/* Cart header */}
      <div className="flex items-center justify-between px-5 py-4
        border-b border-slate-100 dark:border-white/[0.07] shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-emerald-500" />
          <span className="text-[14px] font-bold text-slate-800 dark:text-white">
            Cart
          </span>
          {cartCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black
              bg-emerald-500 text-white tabular-nums">
              {cartCount}
            </span>
          )}
        </div>
        {cart.length > 0 && (
          <button
            onClick={() => setCart([])}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-500/10
              hover:text-rose-400 transition-all"
            title="Clear cart"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-10">
            <ShoppingCart size={36} className="text-slate-200 dark:text-slate-800" />
            <p className="text-[12px] text-slate-400 dark:text-slate-600 text-center leading-relaxed">
              Your cart is empty.<br />Add items from the menu.
            </p>
          </div>
        ) : (
          cart.map(item => (
            <div
              key={item.id}
              className="p-3 rounded-xl space-y-2.5 pop-in
                bg-slate-50 dark:bg-white/[0.03]
                border border-slate-100 dark:border-white/[0.06]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[12px] font-bold text-slate-800 dark:text-slate-200 leading-snug">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    ₹{item.price} × {item.quantity}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-[13px] font-black text-slate-700 dark:text-slate-200">
                    ₹{(item.price * item.quantity).toFixed(0)}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 active:scale-95 transition-all"
                    title="Remove item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Qty stepper */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-0 rounded-lg overflow-hidden
                  border border-slate-200 dark:border-white/[0.08]">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="px-2.5 py-1.5 text-slate-500 dark:text-slate-400
                      hover:bg-rose-500/10 hover:text-rose-400
                      transition-colors border-r border-slate-200 dark:border-white/[0.07]"
                  >
                    <Minus size={10} />
                  </button>
                  <span className="px-3 text-[12px] font-black text-slate-800 dark:text-slate-100 tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="px-2.5 py-1.5 text-slate-500 dark:text-slate-400
                      hover:bg-emerald-500/10 hover:text-emerald-500
                      transition-colors border-l border-slate-200 dark:border-white/[0.07]"
                  >
                    <Plus size={10} />
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Chef note…"
                  value={item.specialNotes}
                  onChange={e => updateNotes(item.id, e.target.value)}
                  className="flex-1 text-[11px] bg-transparent border-b
                    border-slate-200 dark:border-white/[0.08]
                    text-slate-500 dark:text-slate-400
                    placeholder-slate-300 dark:placeholder-slate-700
                    focus:outline-none focus:border-emerald-500
                    pb-0.5 transition-colors"
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart footer */}
      {cart.length > 0 && (
        <div className="shrink-0 px-4 py-4 border-t border-slate-100 dark:border-white/[0.07] space-y-3">
          <div className="flex justify-between items-center text-[13px] font-semibold">
            <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
            <span className="font-black text-slate-800 dark:text-white text-[15px]">
              ₹{cartTotal.toFixed(0)}
            </span>
          </div>

          {error && (
            <p className="text-[11px] text-rose-400 font-medium">{error}</p>
          )}

          <button
            onClick={handleSubmitOrder}
            disabled={submitting}
            className="w-full py-3 rounded-xl text-[13px] font-bold text-white
              bg-emerald-500 hover:bg-emerald-600
              active:scale-[0.98] transition-all
              shadow-lg shadow-emerald-500/20
              flex items-center justify-center gap-2
              disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting
              ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Send size={14} /><span>Place Order → Kitchen</span></>
            }
          </button>
        </div>
      )}
    </div>
  );

  /* ══════════ MAIN VIEW ══════════ */
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top sub-header ── */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-3
        bg-white dark:bg-[#111420]
        border-b border-slate-100 dark:border-white/[0.07]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg text-slate-400
              hover:bg-slate-100 dark:hover:bg-white/[0.06]
              hover:text-rose-400 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-[14px] font-bold text-slate-800 dark:text-white">
              Table {state?.tableNumber} — Order Menu
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {state?.customerName} · {state?.customerPhone}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Schedule badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg
            text-[11px] font-bold capitalize
            bg-amber-50 dark:bg-amber-500/10
            text-amber-600 dark:text-amber-400
            border border-amber-100 dark:border-amber-500/20">
            <Tag size={11} />
            {schedule} Menu Active
          </div>

          {/* Time override */}
          <select
            value={timeOverride}
            onChange={e => setTimeOverride(e.target.value)}
            className="text-[11px] font-semibold px-2 py-1.5 rounded-lg
              bg-slate-50 dark:bg-white/[0.05]
              border border-slate-200 dark:border-white/[0.08]
              text-slate-500 dark:text-slate-400
              focus:outline-none"
          >
            <option value="">Live Time</option>
            <option value="12:00">Lunch Test</option>
            <option value="20:00">Dinner Test</option>
          </select>

          {/* Mobile cart toggle */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              bg-emerald-500 text-white text-[12px] font-bold
              shadow-md shadow-emerald-500/20"
          >
            <ShoppingCart size={13} />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full
                bg-white text-emerald-600 text-[9px] font-black
                flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Body: menu + cart ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: Menu browser ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Search + category filters */}
          <div className="shrink-0 flex flex-col gap-3 px-6 py-4
            border-b border-slate-100 dark:border-white/[0.06]
            bg-white dark:bg-[#111420]">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search dishes…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="premium-input pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold
                    capitalize whitespace-nowrap shrink-0 transition-all duration-150
                    ${selectedCategory === cat
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                    }`}
                >
                  <span>{CAT_EMOJI[cat]}</span>
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Menu items */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse-slow">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex gap-3 p-4 rounded-xl
                    border border-slate-100 dark:border-white/[0.06]">
                    <div className="shimmer-skeleton w-20 h-20 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="shimmer-skeleton h-4 w-3/4 rounded" />
                      <div className="shimmer-skeleton h-3 w-1/2 rounded" />
                      <div className="shimmer-skeleton h-3 w-full rounded" />
                      <div className="shimmer-skeleton h-7 w-24 rounded-lg ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredMenu.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <UtensilsCrossed size={40} className="text-slate-200 dark:text-slate-800" />
                <p className="text-[13px] text-slate-400 dark:text-slate-600">
                  No dishes match your selection.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredMenu.map(dish => {
                  const inCart = cart.find(i => i.id === dish.id);
                  return (
                    <div key={dish.id} className="menu-card fade-in-up">
                      {/* Dish image */}
                      {dish.image_url ? (
                        <img
                          src={dish.image_url}
                          alt={dish.name}
                          className="w-20 h-20 rounded-xl object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl shrink-0 flex items-center justify-center
                          bg-slate-100 dark:bg-white/[0.04] text-[26px]">
                          {CAT_EMOJI[dish.category] || '🍽️'}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-100
                              leading-snug truncate">
                              {dish.name}
                            </h4>
                            <span className="text-[13px] font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                              ₹{dish.price}
                            </span>
                          </div>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold
                            uppercase tracking-wider capitalize
                            bg-slate-100 dark:bg-white/[0.05]
                            text-slate-400 dark:text-slate-600">
                            {dish.category}
                          </span>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                            {dish.description}
                          </p>
                        </div>

                        {/* Add/qty control */}
                        <div className="mt-3 flex justify-end">
                          {inCart ? (
                            <div className="flex items-center gap-0 rounded-lg overflow-hidden
                              border border-slate-200 dark:border-white/[0.1]">
                              <button
                                onClick={() => updateQty(dish.id, -1)}
                                className="px-2.5 py-1.5 text-slate-500 hover:bg-rose-500/10
                                  hover:text-rose-400 transition-colors border-r border-slate-200 dark:border-white/[0.07]"
                              >
                                <Minus size={11} />
                              </button>
                              <span className="px-3 text-[12px] font-black text-slate-800 dark:text-white tabular-nums">
                                {inCart.quantity}
                              </span>
                              <button
                                onClick={() => updateQty(dish.id, 1)}
                                className="px-2.5 py-1.5 text-slate-500 hover:bg-emerald-500/10
                                  hover:text-emerald-500 transition-colors border-l border-slate-200 dark:border-white/[0.07]"
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(dish)}
                              className="flex items-center gap-1 px-4 py-1.5 rounded-lg
                                text-[12px] font-bold
                                bg-emerald-500 hover:bg-emerald-600
                                text-white active:scale-95 transition-all
                                shadow-sm shadow-emerald-500/20"
                            >
                              <Plus size={12} />
                              <span>ADD</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Cart panel (desktop) ── */}
        <div className="hidden lg:flex w-[320px] shrink-0 flex-col
          border-l border-slate-100 dark:border-white/[0.07]
          bg-white dark:bg-[#111420]">
          <CartPanel />
        </div>
      </div>

      {/* ── Mobile cart drawer ── */}
      {cartOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setCartOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden
            bg-white dark:bg-[#161a26]
            rounded-t-2xl shadow-2xl
            border-t border-slate-100 dark:border-white/[0.08]
            h-[75vh] flex flex-col modal-enter">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-white/[0.1] mx-auto" />
            </div>
            <button
              onClick={() => setCartOpen(false)}
              className="absolute top-3 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              ✕
            </button>
            <div className="flex-1 overflow-hidden">
              <CartPanel />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OrderEntry;
