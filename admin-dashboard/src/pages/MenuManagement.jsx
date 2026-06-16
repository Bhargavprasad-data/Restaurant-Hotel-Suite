import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, AlertTriangle, Eye, EyeOff, Search } from 'lucide-react';

const MenuManagement = () => {
  const { apiFetch } = useAuth();
  const socket = useSocket();

  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Live socket updates for menu catalog sync
  useEffect(() => {
    if (!socket) return;
    const handleMenuUpdate = (data) => {
      console.log('⚡ Real-time menu catalog update detected:', data);
      fetchMenu();
    };
    socket.on('menu-update', handleMenuUpdate);
    return () => {
      socket.off('menu-update', handleMenuUpdate);
    };
  }, [socket]);
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Modal Control States
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingItem, setEditingItem] = useState(null);

  // Form States
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('starter');
  const [timeRestriction, setTimeRestriction] = useState('all');
  const [isAvailable, setIsAvailable] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const retryTimeoutRef = React.useRef(null);

  const fetchMenu = async () => {
    try {
      const data = await apiFetch('/menu?admin=true');
      if (Array.isArray(data)) {
        setMenu(data);
      } else if (data && Array.isArray(data.menu)) {
        setMenu(data.menu);
      } else {
        setMenu([]);
      }
      setError(null);
      setLoading(false); // Success! Hide loading skeleton
    } catch (err) {
      console.error('Menu fetch failure:', err);
      setError('Failed to fetch menu items. Retrying connection to backend...');
      setLoading(true); // Retain loading shell when backend is offline
      
      // Auto-retry in 3 seconds to check if backend came online
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(fetchMenu, 3000);
    }
  };

  useEffect(() => {
    fetchMenu();
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  const handleToggleAvailability = async (item) => {
    try {
      await apiFetch(`/menu/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...item, is_available: !item.is_available }),
      });
      setMenu(prev => prev.map(m => m.id === item.id ? { ...m, is_available: !m.is_available } : m));
    } catch (err) {
      alert('Failed to toggle availability status.');
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setName('');
    setDescription('');
    setPrice('');
    setCategory('starter');
    setTimeRestriction('all');
    setIsAvailable(true);
    setImageUrl('');
    setEditingItem(null);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setModalMode('edit');
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description);
    setPrice(item.price.toString());
    setCategory(item.category);
    setTimeRestriction(item.time_restriction);
    setIsAvailable(item.is_available);
    setImageUrl(item.image_url || '');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this dish from the menu?')) return;
    try {
      await apiFetch(`/menu/${id}`, { method: 'DELETE' });
      fetchMenu();
    } catch (err) {
      alert(err.message || 'Failed to remove dish.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category,
      time_restriction: timeRestriction,
      is_available: isAvailable,
      image_url: imageUrl.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'
    };

    try {
      if (modalMode === 'create') {
        await apiFetch('/menu', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/menu/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      fetchMenu();
    } catch (err) {
      setError(err.message || 'Saving operations failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter & search menu list
  const filteredMenu = (Array.isArray(menu) ? menu : []).filter(item => {
    if (!item) return false;
    const name = item.name || '';
    const description = item.description || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: 'all', label: 'All Dishes' },
    { value: 'starter', label: 'Starters' },
    { value: 'main', label: 'Main Course' },
    { value: 'dessert', label: 'Desserts' },
    { value: 'beverage', label: 'Beverages' }
  ];

  // Stagger configurations
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  if (loading && menu.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="page-header-block">
          <div>
            <div className="shimmer-skeleton" style={{ width: '15rem', height: '2rem', marginBottom: '0.5rem' }} />
            <div className="shimmer-skeleton" style={{ width: '25rem', height: '0.8rem' }} />
          </div>
          <div className="shimmer-skeleton" style={{ width: '10rem', height: '2.25rem', borderRadius: 'var(--radius-sm)' }} />
        </div>

        <div className="glass-card" style={{ height: '5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem' }}>
          <div className="shimmer-skeleton" style={{ width: '50%', height: '1.8rem', borderRadius: 'var(--radius-md)' }} />
          <div className="shimmer-skeleton" style={{ width: '20%', height: '1.8rem', borderRadius: 'var(--radius-md)' }} />
        </div>

        <div className="menu-grid-layout">
          {[1, 2, 3, 4, 5, 6].map(idx => (
            <div key={idx} className="glass-card" style={{ height: '23rem', display: 'flex', flexDirection: 'column', padding: 0 }}>
              <div className="shimmer-skeleton" style={{ height: '12rem', width: '100%' }} />
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="shimmer-skeleton" style={{ width: '50%', height: '1rem' }} />
                  <div className="shimmer-skeleton" style={{ width: '20%', height: '1rem' }} />
                </div>
                <div className="shimmer-skeleton" style={{ width: '100%', height: '2.5rem', marginTop: '0.25rem' }} />
                <div className="shimmer-skeleton" style={{ width: '35%', height: '1rem', borderRadius: '999px', marginTop: '0.25rem' }} />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', width: '100%', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                  <div className="shimmer-skeleton" style={{ flex: 1, height: '1.8rem', borderRadius: 'var(--radius-sm)' }} />
                  <div className="shimmer-skeleton" style={{ flex: 1, height: '1.8rem', borderRadius: 'var(--radius-sm)' }} />
                </div>
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
      {/* Header Panel */}
      <div className="page-header-block" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Menu Management</h1>
          <p className="page-subtitle">Edit ingredients, adjust pricing structures, toggle availability, and configure daily lunch/dinner restrictions.</p>
        </div>
        <motion.button 
          onClick={openCreateModal}
          className="button-primary"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={16} />
          Add Culinary Dish
        </motion.button>
      </div>

      {/* Search & Tabs Ribbon */}
      <div className="menu-controls glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
        {/* Category Tabs */}
        <div className="menu-tabs">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`menu-tab-btn ${activeCategory === cat.value ? 'menu-tab-btn-active' : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', maxWidth: '18rem', width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search dish name, details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.25rem', paddingTop: '0.6rem', paddingBottom: '0.6rem', fontSize: '0.8rem' }}
          />
        </div>
      </div>

      {error && (
        <div className="glass-card" style={{ borderLeft: '4px solid var(--color-danger)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--color-danger-bg)' }}>
          <AlertTriangle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-danger)' }}>{error}</span>
        </div>
      )}

      {/* Culinary Catalog Grid */}
      <div className="menu-grid-layout">
        {filteredMenu.map(item => (
          <motion.div 
            key={item.id}
            variants={itemVariants}
            whileHover={{ y: -4, scale: 1.01 }}
            className="glass-card menu-card-item"
            style={{ padding: 0, opacity: item.is_available ? 1 : 0.65, display: 'flex', flexDirection: 'column' }}
          >
            {/* Visual Image Header */}
            <div className="menu-card-img-block">
              <img 
                src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'} 
                alt={item.name} 
                className="menu-card-img"
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 70%)' }}></div>
              
              {/* Category badge */}
              <span className="menu-card-category-badge">
                {item.category}
              </span>

              {/* Availability quick indicator */}
              <button 
                onClick={() => handleToggleAvailability(item)}
                style={{ 
                  position: 'absolute', 
                  top: '0.75rem', 
                  right: '0.75rem', 
                  padding: '0.4rem', 
                  borderRadius: 'var(--radius-sm)', 
                  border: '1px solid rgba(255,255,255,0.2)', 
                  background: item.is_available ? 'rgba(16,185,129,0.85)' : 'rgba(239,68,68,0.85)', 
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                  transition: 'all 0.2s ease'
                }}
                title={item.is_available ? "Deactivate Dish" : "Activate Dish"}
              >
                {item.is_available ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>

              <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', right: '0.75rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <h3 className="menu-card-title" style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.8)', fontSize: '1rem', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{item.name}</h3>
                <span className="menu-card-price-badge" style={{ position: 'static', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--color-primary)' }}>₹{parseFloat(item.price).toFixed(2)}</span>
              </div>
            </div>

            {/* Description & Scheduling */}
            <div className="menu-card-body" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
              <p className="menu-card-desc" style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, minHeight: '2.25rem' }}>
                {item.description}
              </p>
              
              {/* Time restrict banner */}
              <div style={{ marginTop: 'auto' }}>
                <span className={`status-badge ${
                  item.time_restriction === 'all' ? 'status-available' :
                  item.time_restriction === 'lunch' ? 'status-cooking' : 'status-ready'
                }`} style={{ fontSize: '0.65rem' }}>
                  {item.time_restriction === 'all' ? '🕒 All Day Menu' :
                   item.time_restriction === 'lunch' ? '☀️ Lunch Menu Only' : '🌙 Dinner Menu Only'}
                </span>
              </div>
            </div>

            {/* Action operations */}
            <div className="menu-card-actions" style={{ padding: '0.75rem 1.25rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', width: '100%' }}>
              <button 
                onClick={() => openEditModal(item)}
                className="table-icon-btn"
                style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', fontWeight: 700, display: 'flex', gap: '0.25rem' }}
              >
                <Edit2 size={12} />
                Configure
              </button>
              <button 
                onClick={() => handleDelete(item.id)}
                className="table-icon-btn table-icon-btn-danger"
                style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', fontWeight: 700, display: 'flex', gap: '0.25rem' }}
              >
                <Trash2 size={12} />
                Remove
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredMenu.length === 0 && (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 650 }}>
          No dishes found matching selection.
        </div>
      )}

      {/* Create / Edit Dish Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="modal-backdrop">
            <motion.div 
              className="modal-content"
              style={{ maxWidth: '32rem' }}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            >
              <div className="modal-header">
                <h2 className="modal-title">
                  {modalMode === 'create' ? 'Add Menu Dish' : `Configure: ${editingItem?.name}`}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Dish Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Spicy Penne Arrabiata"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Pricing (₹ INR)</label>
                    <input 
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      placeholder="e.g. 350.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea 
                    required
                    placeholder="Provide ingredients, cooking details, allergy warnings..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-field"
                    style={{ height: '4.5rem', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="select-field"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                      <option value="starter">Starter</option>
                      <option value="main">Main Course</option>
                      <option value="dessert">Dessert</option>
                      <option value="beverage">Beverage</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Time Scheduling</label>
                    <select
                      value={timeRestriction}
                      onChange={(e) => setTimeRestriction(e.target.value)}
                      className="select-field"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                      <option value="all">All Day Menu</option>
                      <option value="lunch">Lunch Hours (11:00 AM - 4:00 PM)</option>
                      <option value="dinner">Dinner Hours (6:00 PM - Midnight)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Dish Visual Link (Image URL)</label>
                  <input 
                    type="url"
                    placeholder="https://images.unsplash.com/... (Optional)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
                  <input 
                    type="checkbox"
                    id="modalIsAvailable"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    style={{ height: '1rem', width: '1rem', cursor: 'pointer' }}
                  />
                  <label htmlFor="modalIsAvailable" className="form-label" style={{ cursor: 'pointer', margin: 0, userSelect: 'none' }}>
                    Publish Available instantly for Order entries
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
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
                      <span>{modalMode === 'create' ? 'Publish Dish' : 'Update Catalog'}</span>
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

export default MenuManagement;
