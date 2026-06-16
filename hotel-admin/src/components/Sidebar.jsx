import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, BedDouble, CalendarCheck, Users,
  LogOut, Hotel
} from 'lucide-react';

const navItems = [
  { path: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { path: '/rooms',    label: 'Rooms',     icon: BedDouble       },
  { path: '/bookings', label: 'Bookings',  icon: CalendarCheck   },
  { path: '/users',    label: 'Guests',    icon: Users           },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const expanded = isHovered;

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <>
      {/* Spacer to push main layout content when sidebar is collapsed (desktop only) */}
      <div
        className="hidden sm:block shrink-0"
        style={{ width: 'var(--sidebar-collapsed)' }}
      />

      <aside
        className={`admin-sidebar ${expanded ? 'expanded' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >

      {/* ── Logo ── */}
      <div className="sidebar-logo-row">
        <div className="sidebar-logo-icon">
          <Hotel size={15} style={{ color: 'white' }} />
        </div>
        <div className="sidebar-logo-text">
          <span className="name">Tasty Admin</span>
          <span className="sub">Hotel Console</span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="sidebar-nav no-scrollbar">
        <div className="sidebar-section-label">Menu</div>

        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              title={!expanded ? label : undefined}
            >
              <div className="sidebar-icon-wrap">
                <Icon size={15} />
              </div>
              <span className="sidebar-label">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="sidebar-footer">

        {/* User info */}
        <div className="sidebar-footer-row">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || 'Admin'}</div>
            <div className="sidebar-user-role">Administrator</div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="sidebar-action-btn logout"
          title={!expanded ? 'Logout' : undefined}
        >
          <div className="sidebar-icon-wrap" style={{ color: '#f87171' }}>
            <LogOut size={15} />
          </div>
          <span className="action-label" style={{ color: '#f87171' }}>Logout</span>
        </button>

      </div>
    </aside>
    </>
  );
};

export default Sidebar;
