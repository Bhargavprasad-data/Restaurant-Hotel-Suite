import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  BedDouble, CalendarCheck, Users, TrendingUp,
  ArrowRight, RefreshCw, ArrowUpRight, CheckCircle2,
  Sun, Moon, Inbox
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import toast from 'react-hot-toast';

const StatusDot = ({ status }) => {
  const map = {
    'Confirmed':   { color: '#4ade80' },
    'Checked In':  { color: '#818cf8' },
    'Checked Out': { color: 'var(--text-muted)' },
    'Cancelled':   { color: '#f87171' },
    'Pending':     { color: '#fb923c' },
  };
  const { color } = map[status] || { color: 'var(--text-muted)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}`, display: 'inline-block', flexShrink: 0 }} />
      <span style={{ fontSize: 11.5, fontWeight: 600, color }}>{status}</span>
    </span>
  );
};

const getPaymentBadge = (status) => {
  if (status === 'Paid') return <span className="badge badge-success">Paid</span>;
  return <span className="badge badge-warning">{status || 'Pending'}</span>;
};

const AdminDashboard = () => {
  const { apiFetch, user } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await apiFetch('/admin/stats');
      setStats(data);
    } catch (err) {
      toast.error('Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleBookingUpdated = (data) => {
      // Re-fetch dashboard statistics to update KPIs and recent bookings live
      fetchStats(true);
      
      if (data.sender_id === user?.id) return; // Skip toast if sender is the current user

      const customer = data.booking?.customer_name || 'A customer';
      const room = data.booking?.room_number || '';
      
      if (data.action === 'create') {
        toast.success(`Received a new booking for Room ${room} from ${customer}!`, { id: 'admin-dashboard-toast' });
      } else if (data.action === 'payment_verified') {
        toast.success(`Booking confirmed! Payment successful for ${customer} (Room ${room}).`, { id: 'admin-dashboard-toast' });
      } else if (data.action === 'cancel') {
        toast.error(`Booking for Room ${room} has been cancelled by ${customer}.`, { id: 'admin-dashboard-toast' });
      } else if (data.action === 'status_change') {
        toast.success(`Booking status updated to ${data.booking?.booking_status} for ${customer}.`, { id: 'admin-dashboard-toast' });
      }
    };

    const handleRoomUpdated = (data) => {
      // Re-fetch dashboard statistics to update room count KPIs live
      fetchStats(true);
    };

    socket.on('booking:updated', handleBookingUpdated);
    socket.on('room:updated', handleRoomUpdated);
    
    return () => {
      socket.off('booking:updated', handleBookingUpdated);
      socket.off('room:updated', handleRoomUpdated);
    };
  }, [socket, user]);

  const kpiData = stats ? [
    { label: 'Total Rooms',    value: stats.kpis.totalRooms,    icon: BedDouble,    iconBg: 'rgba(99,102,241,0.14)',  iconColor: '#818cf8' },
    { label: 'Active Bookings', value: stats.kpis.activeBookings, icon: CalendarCheck, iconBg: 'rgba(34,197,94,0.12)', iconColor: '#4ade80' },
    { label: 'Occupancy Rate', value: stats.kpis.occupancyRate, icon: Users,         iconBg: 'rgba(251,146,60,0.12)', iconColor: '#fb923c' },
    { label: 'Total Revenue',  value: `₹${Number(stats.kpis.totalRevenue || 0).toLocaleString('en-IN')}`, icon: TrendingUp, iconBg: 'rgba(255,107,53,0.12)', iconColor: '#ff6b35' },
  ] : [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar />

      <div className="admin-main">
        <Topbar
          title="Dashboard"
          breadcrumb={`${greeting}, ${user?.name?.split(' ')[0] || 'Admin'}`}
          onRefresh={() => fetchStats(true)}
          refreshing={refreshing}
        />

        <div className="admin-content">

          {/* KPI Cards */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 14, marginBottom: 20 }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 88 }} />)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 14, marginBottom: 20 }}>
              {kpiData.map((kpi, idx) => {
                const Icon = kpi.icon;
                return (
                  <div key={idx} className="stat-card animate-fade-in-up" style={{ animationDelay: `${idx * 60}ms` }}>
                    <div className="stat-icon" style={{ background: kpi.iconBg, color: kpi.iconColor }}>
                      <Icon size={17} />
                    </div>
                    <div>
                      <div className="stat-label">{kpi.label}</div>
                      <div className="stat-value">{kpi.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Content Grid */}
          {!loading && stats && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, alignItems: 'start' }}>

              {/* Recent Bookings */}
              <div className="panel-card animate-fade-in-up" style={{ animationDelay: '260ms' }}>
                <div className="panel-header">
                  <div>
                    <div className="panel-title">Recent Bookings</div>
                    <div className="panel-subtitle">Latest reservation activity</div>
                  </div>
                  <Link to="/bookings" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                    View All <ArrowUpRight size={11} />
                  </Link>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  {stats.recentBookings.length === 0 ? (
                    <div className="empty-state animate-fade-in">
                      <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Inbox size={26} style={{ color: 'var(--text-muted)', strokeWidth: 1.5 }} />
                      </div>
                      <div className="empty-state-text">No bookings yet</div>
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Guest</th>
                          <th>Room</th>
                          <th>Dates</th>
                          <th>Amount</th>
                          <th>Payment</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentBookings.map(b => (
                          <tr key={b.id}>
                            <td className="td-primary">{b.customer_name}</td>
                            <td><span className="badge badge-neutral">#{b.room_number}</span></td>
                            <td className="td-mono" style={{ fontSize: 11, lineHeight: 1.6 }}>
                              {b.check_in_date?.substring(0,10)}<br/>{b.check_out_date?.substring(0,10)}
                            </td>
                            <td className="td-mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                              ₹{Number(b.total_price).toLocaleString('en-IN')}
                            </td>
                            <td>{getPaymentBadge(b.payment_status)}</td>
                            <td><StatusDot status={b.booking_status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Quick Actions */}
                <div className="panel-card animate-fade-in-up" style={{ animationDelay: '320ms' }}>
                  <div className="panel-header">
                    <div className="panel-title">Quick Actions</div>
                  </div>
                  <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Link to="/rooms" className="btn btn-primary" style={{ textDecoration: 'none', width: '100%', justifyContent: 'space-between' }}>
                      <span>Manage Rooms</span><ArrowRight size={13} />
                    </Link>
                    <Link to="/bookings" className="btn btn-secondary" style={{ textDecoration: 'none', width: '100%', justifyContent: 'space-between' }}>
                      <span>View Bookings</span><ArrowRight size={13} />
                    </Link>
                    <Link to="/users" className="btn btn-secondary" style={{ textDecoration: 'none', width: '100%', justifyContent: 'space-between' }}>
                      <span>Guest Accounts</span><ArrowRight size={13} />
                    </Link>
                  </div>
                </div>

                {/* System Status */}
                <div className="panel-card animate-fade-in-up" style={{ animationDelay: '380ms' }}>
                  <div className="panel-header">
                    <div className="panel-title">System Status</div>
                  </div>
                  <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {['Booking Engine','Payment Gateway','Email Service'].map(s => (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{s}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#4ade80' }}>
                          <CheckCircle2 size={11} /> Operational
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
