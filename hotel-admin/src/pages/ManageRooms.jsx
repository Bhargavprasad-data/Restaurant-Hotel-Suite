import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { Plus, Trash2, Edit3, X, RefreshCw, Search, BedDouble, Sun, Moon } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import toast from 'react-hot-toast';

const statusBadge = (status) => {
  if (status === 'available') return <span className="badge badge-success">Available</span>;
  if (status === 'occupied') return <span className="badge badge-error">Occupied</span>;
  return <span className="badge badge-warning">Maintenance</span>;
};

const ManageRooms = () => {
  const { user, apiFetch } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [formData, setFormData] = useState({
    room_number: '', room_type: 'single', price: '',
    capacity: '1', description: '', amenities: '',
    image_url: '', availability_status: 'available'
  });

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/rooms?limit=100');
      setRooms(data.rooms);
    } catch (err) {
      toast.error('Failed to load room catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRooms(); }, []);

  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdated = (data) => {
      fetchRooms();
      if (data.sender_id === user?.id) return; // Skip toast if sender is the current user
      if (data.action === 'create') {
        toast.success(`New Room ${data.room?.room_number || ''} added in real-time.`, { id: 'admin-rooms-toast' });
      } else if (data.action === 'update') {
        toast.success(`Room ${data.room?.room_number || ''} updated in real-time.`, { id: 'admin-rooms-toast' });
      } else if (data.action === 'delete') {
        toast.success(`A room has been removed from catalog in real-time.`, { id: 'admin-rooms-toast' });
      }
    };

    socket.on('room:updated', handleRoomUpdated);
    return () => {
      socket.off('room:updated', handleRoomUpdated);
    };
  }, [socket, user]);

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setFormData({ room_number: '', room_type: 'single', price: '', capacity: '1', description: '', amenities: '', image_url: '', availability_status: 'available' });
    setUploadedImages([]);
    setModalOpen(true);
  };

  const handleOpenEdit = (room) => {
    setEditingRoom(room);
    
    let parsedImages = [];
    if (room.image_url) {
      if (room.image_url.startsWith('[')) {
        try {
          parsedImages = JSON.parse(room.image_url);
        } catch (e) {
          parsedImages = [room.image_url];
        }
      } else {
        parsedImages = [room.image_url];
      }
    }
    setUploadedImages(parsedImages);

    setFormData({
      room_number: room.room_number,
      room_type: room.room_type,
      price: room.price,
      capacity: room.capacity.toString(),
      description: room.description || '',
      amenities: room.amenities ? room.amenities.join(', ') : '',
      image_url: room.image_url || '',
      availability_status: room.availability_status
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.room_number || !formData.price || !formData.capacity) {
      toast.error('Please fill in required fields.');
      return;
    }
    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      capacity: parseInt(formData.capacity),
      amenities: formData.amenities ? formData.amenities.split(',').map(s => s.trim()) : [],
      image_url: JSON.stringify(uploadedImages)
    };
    setSaving(true);
    try {
      if (editingRoom) {
        await apiFetch(`/rooms/${editingRoom.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Room updated successfully!');
      } else {
        await apiFetch(`/rooms`, { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Room created successfully!');
      }
      setModalOpen(false);
      fetchRooms();
    } catch (err) {
      toast.error(err.message || 'Failed to save room.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (roomId) => {
    if (!window.confirm('Delete this room listing?')) return;
    try {
      await apiFetch(`/rooms/${roomId}`, { method: 'DELETE' });
      toast.success('Room deleted.');
      fetchRooms();
    } catch (err) {
      toast.error(err.message || 'Failed to delete room.');
    }
  };

  const filtered = rooms.filter(r =>
    !search || r.room_number?.toString().includes(search) || r.room_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar />

      <div className="admin-main">
        <Topbar
          title="Rooms"
          breadcrumb="Manage room inventory & availability"
          onRefresh={fetchRooms}
          extraActions={
            <button onClick={handleOpenAdd} className="btn btn-primary">
              <Plus size={13} /> Add Room
            </button>
          }
        />

        <div className="admin-content">

          {/* Search + count bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
            <div style={{ position: 'relative', flex: '0 0 260px' }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search rooms..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="admin-input"
                style={{ paddingLeft: 32, height: 36, fontSize: 12 }}
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
              {filtered.length} <span style={{ color: 'var(--text-muted)' }}>rooms</span>
            </div>
          </div>

          {/* Table */}
          <div className="panel-card">
            {loading ? (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 44 }} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BedDouble size={26} style={{ color: 'var(--text-muted)', strokeWidth: 1.5 }} />
                </div>
                <div className="empty-state-text">{search ? 'No rooms match your search' : 'No rooms added yet'}</div>
                <div className="empty-state-sub">Click "Add Room" to create the first entry</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Type</th>
                      <th>Price / Night</th>
                      <th>Capacity</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((room) => (
                      <tr key={room.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <BedDouble size={14} style={{ color: '#818cf8' }} />
                            </div>
                            <span className="td-primary" style={{ fontSize: 13 }}>#{room.room_number}</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>{room.room_type}</span>
                        </td>
                        <td className="td-mono" style={{ color: '#ff6b35', fontWeight: 700, fontSize: 13 }}>
                          ₹{Number(room.price).toLocaleString('en-IN')}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                          {room.capacity} guest{room.capacity !== 1 ? 's' : ''}
                        </td>
                        <td>{statusBadge(room.availability_status)}</td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                            <button
                              onClick={() => handleOpenEdit(room)}
                              className="btn btn-secondary btn-sm btn-icon"
                              title="Edit"
                              style={{ padding: '5px' }}
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(room.id)}
                              className="btn btn-danger btn-sm btn-icon"
                              title="Delete"
                              style={{ padding: '5px' }}
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
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <div className="modal-title">{editingRoom ? 'Edit Room' : 'Add New Room'}</div>
              <button onClick={() => setModalOpen(false)} className="btn btn-ghost btn-icon" style={{ padding: 5 }}>
                <X size={15} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="input-label">Room Number *</label>
                    <input type="text" value={formData.room_number} onChange={e => setFormData({...formData, room_number: e.target.value})} placeholder="101" className="admin-input" required />
                  </div>
                  <div>
                    <label className="input-label">Room Type *</label>
                    <select value={formData.room_type} onChange={e => setFormData({...formData, room_type: e.target.value})} className="admin-input">
                      <option value="single">Single</option>
                      <option value="double">Double</option>
                      <option value="suite">Suite</option>
                      <option value="deluxe">Deluxe</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="input-label">Price Per Night *</label>
                    <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="4500" className="admin-input" required />
                  </div>
                  <div>
                    <label className="input-label">Max Capacity *</label>
                    <select value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} className="admin-input">
                      <option value="1">1 Guest</option>
                      <option value="2">2 Guests</option>
                      <option value="3">3 Guests</option>
                      <option value="4">4+ Guests</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="input-label">Description</label>
                  <textarea rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Room description..." className="admin-input" />
                </div>

                <div>
                  <label className="input-label">Amenities (comma separated)</label>
                  <input type="text" value={formData.amenities} onChange={e => setFormData({...formData, amenities: e.target.value})} placeholder="WiFi, AC, TV, Mini Bar" className="admin-input" />
                </div>

                <div>
                  <label className="input-label">Room Images (Upload Multiple, Max 8)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))', gap: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '12px', boxSizing: 'border-box' }}>
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={img} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...uploadedImages];
                            updated.splice(idx, 1);
                            setUploadedImages(updated);
                          }}
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.9)',
                            color: 'white',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                          title="Remove Image"
                        >
                          <X size={9} />
                        </button>
                      </div>
                    ))}
                    
                    {uploadedImages.length < 8 && (
                      <div style={{ position: 'relative', aspectRatio: '1' }}>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files);
                            const promises = files.map(file => {
                              return new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result);
                                reader.readAsDataURL(file);
                              });
                            });
                            Promise.all(promises).then(results => {
                              setUploadedImages(prev => [...prev, ...results].slice(0, 8));
                            });
                          }}
                          style={{ display: 'none' }}
                          id="room-images-upload-multiple"
                        />
                        <label
                          htmlFor="room-images-upload-multiple"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            aspectRatio: '1',
                            cursor: 'pointer',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px dashed var(--border-subtle)',
                            borderRadius: 8,
                            color: 'var(--text-secondary)',
                            transition: 'all 0.15s ease',
                            textAlign: 'center',
                            minHeight: '68px'
                          }}
                        >
                          <Plus size={15} style={{ color: 'var(--accent)', marginBottom: 2 }} />
                          <span style={{ fontSize: 9, fontWeight: 600 }}>Add Image</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="input-label">Availability</label>
                    <select value={formData.availability_status} onChange={e => setFormData({...formData, availability_status: e.target.value})} className="admin-input">
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                    {saving ? 'Saving...' : editingRoom ? 'Save Changes' : 'Create Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRooms;
