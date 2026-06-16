import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Table2, ClipboardList, Clock, LogOut, Flame } from 'lucide-react';

const LINKS = [
  { to: '/',           label: 'Tables Map',    icon: Table2,       end: true  },
  { to: '/orders',     label: 'Active Orders', icon: ClipboardList, end: false },
  { to: '/attendance', label: 'Attendance',    icon: Clock,         end: false },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isHovered, setIsHovered]     = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsMobileOpen(p => !p);
    window.addEventListener('toggle-mobile-sidebar', handler);
    return () => window.removeEventListener('toggle-mobile-sidebar', handler);
  }, []);

  if (!user) return null;

  const handleLogout = () => { logout(); navigate('/login'); };
  const expanded = isHovered;

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 sm:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Fixed-width spacer so page content isn't hidden behind the rail (desktop only) */}
      <div
        className="hidden sm:block shrink-0 transition-[width] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ width: 'var(--sidebar-w-collapsed)' }}
      />

      {/* ───── The actual sidebar ───── */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ width: expanded ? 'var(--sidebar-w-expanded)' : 'var(--sidebar-w-collapsed)' }}
        className={`
          sidebar-rail
          fixed top-0 bottom-0 left-0 z-50
          flex flex-col
          bg-[#0d1117]
          border-r border-white/[0.07]
          shadow-[2px_0_20px_rgba(0,0,0,0.5)]
          overflow-hidden
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
        `}
      >

        {/* ── Brand header ── */}
        <div
          className="flex items-center shrink-0 border-b border-white/[0.07] overflow-hidden"
          style={{ height: 'var(--topbar-h)', paddingLeft: '16px', paddingRight: '16px' }}
        >
          {/* Logo icon */}
          <div className="w-[28px] h-[28px] rounded-[8px] bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25">
            <Flame size={14} className="text-white" />
          </div>

          {/* Brand text — fades with sidebar width */}
          <div
            className="sidebar-fade-label ml-3"
            style={{ opacity: expanded ? 1 : 0, maxWidth: expanded ? '180px' : '0px' }}
          >
            <div className="text-[13px] font-bold text-white tracking-wide leading-none">Tasty Bites</div>
            <div className="text-[9px] font-semibold text-emerald-400 uppercase tracking-[0.14em] mt-[3px]">Waiter Panel</div>
          </div>
        </div>

        {/* ── Section label ── */}
        <div
          className="sidebar-fade-label px-4 pt-4 pb-1"
          style={{ opacity: expanded ? 1 : 0, maxWidth: expanded ? '220px' : '0px', height: expanded ? 'auto' : 0 }}
        >
          <span className="text-[9px] font-semibold text-slate-600 uppercase tracking-[0.14em]">Navigation</span>
        </div>

        {/* ── Nav items ── */}
        <nav className="flex-1 flex flex-col gap-0.5 py-2 px-2 overflow-hidden">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={!expanded ? label : undefined}
              onClick={() => setIsMobileOpen(false)}
            >
              {({ isActive }) => (
                <div className={`nav-item ${isActive ? 'active' : ''}`}>
                  <Icon
                    size={17}
                    className={`shrink-0 transition-transform duration-200 ${isActive ? 'text-emerald-400' : ''}`}
                  />
                  <span
                    className="sidebar-fade-label ml-3 text-[13px] font-medium"
                    style={{ opacity: expanded ? 1 : 0, maxWidth: expanded ? '180px' : '0px' }}
                  >
                    {label}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Divider ── */}
        <div className="h-px bg-white/[0.07] mx-2" />

        {/* ── Footer: avatar + name + logout ── */}
        <div className="p-2 space-y-0.5 overflow-hidden shrink-0">

          {/* User info row */}
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg overflow-hidden">
              <div className="w-[28px] h-[28px] rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[11px] font-bold text-emerald-400 shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div
                className="sidebar-fade-label flex flex-col"
                style={{ opacity: expanded ? 1 : 0, maxWidth: expanded ? '180px' : '0px' }}
              >
                <span className="text-[12px] font-semibold text-slate-200 truncate leading-tight">{user.name}</span>
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-[0.1em] mt-0.5">On Duty</span>
              </div>
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={handleLogout}
            title={!expanded ? 'Sign Out' : undefined}
            className="w-full nav-item text-slate-500 hover:!bg-rose-500/[0.1] hover:!text-rose-400 transition-all"
          >
            <LogOut size={15} className="shrink-0" />
            <span
              className="sidebar-fade-label ml-3 text-[13px] font-medium"
              style={{ opacity: expanded ? 1 : 0, maxWidth: expanded ? '180px' : '0px' }}
            >
              Sign Out
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
