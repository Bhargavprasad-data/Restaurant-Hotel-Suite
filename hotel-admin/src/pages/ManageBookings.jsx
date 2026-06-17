import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { RefreshCw, Search, Filter, Sun, Moon, ClipboardList } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['All', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled'];

const getStatusBadge = (status) => {
  const map = {
    'Confirmed':   'badge-success',
    'Checked In':  'badge-info',
    'Checked Out': 'badge-neutral',
    'Cancelled':   'badge-error',
    'Pending':     'badge-warning',
  };
  return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
};

const getPaymentBadge = (status) => {
  if (status === 'Paid') return <span className="badge badge-success">Paid</span>;
  return <span className="badge badge-warning">{status || 'Pending'}</span>;
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  const hasTime = dateStr.includes(':') || (typeof dateStr === 'string' && dateStr.length > 10);
  if (hasTime) {
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${d.toLocaleTimeString('en-US', timeOptions)}`;
  }
  return dateStr.substring(0, 10);
};

const ManageBookings = () => {
  const { user, apiFetch } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [editingBooking, setEditingBooking] = useState(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/bookings');
      // Filter out transient 'Pending' bookings since they are just unpaid checkout drafts
      const filtered = data.filter(b => b.booking_status !== 'Pending');
      setBookings(filtered);
    } catch (err) {
      toast.error('Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleBookingUpdated = (data) => {
      fetchBookings();
      if (data.sender_id === user?.id) return; // Skip toast if sender is the current user
      const customer = data.booking?.customer_name || 'A customer';
      const room = data.booking?.room_number || '';
      
      if (data.action === 'create') {
        toast.success(`New booking placed by ${customer} for Room ${room}!`, { id: 'admin-bookings-toast' });
      } else if (data.action === 'payment_verified') {
        toast.success(`Payment verified successfully for ${customer} (Room ${room})!`, { id: 'admin-bookings-toast' });
      } else if (data.action === 'cancel') {
        toast.error(`Reservation for Room ${room} cancelled by ${customer}.`, { id: 'admin-bookings-toast' });
      } else if (data.action === 'status_change') {
        toast.success(`Booking status changed to ${data.booking?.booking_status} for ${customer}.`, { id: 'admin-bookings-toast' });
      }
    };

    socket.on('booking:updated', handleBookingUpdated);
    return () => {
      socket.off('booking:updated', handleBookingUpdated);
    };
  }, [socket, user]);

  const handleUpdateStatus = async (bookingId, newStatus) => {
    try {
      await apiFetch(`/bookings/${bookingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ booking_status: newStatus })
      });
      toast.success(`Status updated to ${newStatus}`);
      fetchBookings();
    } catch (err) {
      toast.error(err.message || 'Failed to update status.');
    }
  };

  const handleUpdatePaymentStatus = async (bookingId, newPaymentStatus) => {
    try {
      await apiFetch(`/bookings/${bookingId}/payment`, {
        method: 'PUT',
        body: JSON.stringify({ payment_status: newPaymentStatus })
      });
      toast.success(`Payment status updated to ${newPaymentStatus}`);
      fetchBookings();
    } catch (err) {
      toast.error(err.message || 'Failed to update payment status.');
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm('Are you absolutely sure you want to permanently delete this reservation from history?')) return;
    try {
      await apiFetch(`/bookings/${bookingId}`, { method: 'DELETE' });
      toast.success('Reservation permanently deleted.');
      fetchBookings();
    } catch (err) {
      toast.error(err.message || 'Failed to delete booking.');
    }
  };

  const openEditModal = (b) => {
    setEditingBooking(b);
    setEditCheckIn(b.check_in_date?.substring(0, 10) || '');
    setEditCheckOut(b.check_out_date?.substring(0, 10) || '');
  };

  const handleEditBookingSave = async (e) => {
    e.preventDefault();
    if (!editCheckIn || !editCheckOut) {
      toast.error('Please select both check-in and check-out dates.');
      return;
    }
    if (new Date(editCheckIn) >= new Date(editCheckOut)) {
      toast.error('Check-out date must be strictly after check-in.');
      return;
    }

    setUpdating(true);
    try {
      await apiFetch(`/bookings/${editingBooking.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          check_in_date: editCheckIn,
          check_out_date: editCheckOut,
        }),
      });
      toast.success('Booking details updated successfully!');
      setEditingBooking(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.message || 'Failed to update booking dates.');
    } finally {
      setUpdating(false);
    }
  };

  const filtered = bookings.filter(b => {
    const matchFilter = filter === 'All' || b.booking_status === filter;
    
    const cleanSearch = search.trim().toLowerCase();
    
    // 1. Try to extract UUID if a full URL or UUID is typed/scanned
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const matchUuid = cleanSearch.match(uuidRegex);
    const extractedUuid = matchUuid ? matchUuid[0].toLowerCase() : null;

    // 2. Try to extract 8-char reference prefix if "TS-XXXXXXXX" is typed/scanned
    let extractedRef = null;
    if (cleanSearch.startsWith('ts-')) {
      extractedRef = cleanSearch.substring(3);
    }

    const matchSearch = !search ||
      b.customer_name?.toLowerCase().includes(cleanSearch) ||
      b.customer_email?.toLowerCase().includes(cleanSearch) ||
      b.room_number?.toString().includes(cleanSearch) ||
      (extractedUuid && b.id?.toLowerCase() === extractedUuid) ||
      (extractedRef && b.id?.toLowerCase().startsWith(extractedRef)) ||
      b.id?.toLowerCase().includes(cleanSearch);

    return matchFilter && matchSearch;
  });

  const statusCounts = STATUS_OPTIONS.slice(1).reduce((acc, s) => {
    acc[s] = bookings.filter(b => b.booking_status === s).length;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar />

      <div className="admin-main">
        <Topbar
          title="Bookings"
          breadcrumb="Manage guest reservations & stay status"
          onRefresh={fetchBookings}
        />

        <div className="admin-content">

          {/* Status filter pills */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid',
                  transition: 'all 0.15s',
                  borderColor: filter === s ? 'rgba(255,107,53,0.5)' : 'var(--border-subtle)',
                  background: filter === s ? 'rgba(255,107,53,0.12)' : 'transparent',
                  color: filter === s ? '#ff6b35' : 'var(--text-muted)',
                }}
              >
                {s}
                {s !== 'All' && statusCounts[s] > 0 && (
                  <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.8 }}>({statusCounts[s]})</span>
                )}
              </button>
            ))}

            <div style={{ marginLeft: 'auto', position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search guest or room..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="admin-input"
                style={{ paddingLeft: 28, height: 34, width: 220, fontSize: 12 }}
              />
            </div>
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
                  <ClipboardList size={26} style={{ color: 'var(--text-muted)', strokeWidth: 1.5 }} />
                </div>
                <div className="empty-state-text">No bookings found</div>
                <div className="empty-state-sub">Try adjusting your filters or search</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: 840 }}>
                  <thead>
                    <tr>
                      <th>Guest</th>
                      <th>Room</th>
                      <th>Check-in / Check-out</th>
                      <th>Total</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <div>
                            <div className="td-primary" style={{ fontSize: 12.5 }}>{b.customer_name}</div>
                            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>{b.customer_email}</div>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-neutral">#{b.room_number}</span>
                        </td>
                        <td className="td-mono" style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                          {formatDateTime(b.check_in_date)}<br/>
                          {formatDateTime(b.check_out_date)}
                        </td>
                        <td className="td-mono" style={{ color: '#ff6b35', fontWeight: 700, fontSize: 13 }}>
                          ₹{Number(b.total_price).toLocaleString('en-IN')}
                        </td>
                        <td>{getPaymentBadge(b.payment_status)}</td>
                        <td>{getStatusBadge(b.booking_status)}</td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {b.payment_status !== 'Paid' && b.booking_status !== 'Cancelled' && b.booking_status !== 'Checked Out' && (
                              <button onClick={() => handleUpdatePaymentStatus(b.id, 'Paid')} className="btn btn-sm" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 6, fontSize: 10.5 }}>
                                  Mark as Paid
                              </button>
                            )}
                            {b.booking_status === 'Confirmed' && (
                              <button onClick={() => handleUpdateStatus(b.id, 'Checked In')} className="btn btn-sm" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 6, fontSize: 10.5 }}>
                                  Check In
                              </button>
                            )}
                            {b.booking_status === 'Checked In' && (
                              <button onClick={() => handleUpdateStatus(b.id, 'Checked Out')} className="btn btn-sm" style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 6, fontSize: 10.5 }}>
                                Check Out
                              </button>
                            )}
                            {b.booking_status === 'Confirmed' && (
                              <button onClick={() => handleUpdateStatus(b.id, 'Cancelled')} className="btn btn-sm btn-danger" style={{ borderRadius: 6, fontSize: 10.5 }}>
                                Cancel
                              </button>
                            )}
                            {b.booking_status === 'Cancelled' && (
                              <button onClick={() => handleDeleteBooking(b.id)} className="btn btn-sm btn-danger" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, fontSize: 10.5 }}>
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer count */}
          {!loading && (
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
              Showing {filtered.length} of {bookings.length} bookings
            </div>
          )}
        </div>
      </div>

      {editingBooking && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 16,
            width: '100%',
            maxWidth: 400,
            padding: 24,
            position: 'relative',
            color: 'var(--text-primary)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <button
              onClick={() => setEditingBooking(null)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 18
              }}
            >
              ✕
            </button>

            <h3 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 700 }}>Edit Booking Dates</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: 11, color: 'var(--text-muted)' }}>
              Guest: {editingBooking.customer_name} | Room #{editingBooking.room_number}
            </p>

            <form onSubmit={handleEditBookingSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Check-In Date</label>
                <input
                  type="date"
                  value={editCheckIn}
                  onChange={(e) => setEditCheckIn(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    outline: 'none'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Check-Out Date</label>
                <input
                  type="date"
                  value={editCheckOut}
                  onChange={(e) => setEditCheckOut(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    outline: 'none'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 600 }}
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageBookings;
