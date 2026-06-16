import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Grid3X3, UtensilsCrossed, Users,
  LogOut, Flame
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Hover state drives the sidebar expansion (auto open/close)
  const [hovered, setHovered] = useState(false);
  const collapsed = !hovered;

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    {
      to: '/',
      label: 'Overview',
      icon: LayoutDashboard,
      end: true,
    },
    {
      to: '/tables',
      label: 'Tables',
      icon: Grid3X3,
      end: false,
    },
    {
      to: '/menu',
      label: 'Menu',
      icon: UtensilsCrossed,
      end: false,
    },
    {
      to: '/staff',
      label: 'Staff',
      icon: Users,
      end: false,
    },
  ];

  const sidebarW = collapsed ? 64 : 240;

  return (
    <>
      {/* Permanent invisible spacer to reserve 64px space on the left so that the main content is never covered */}
      <div style={{ width: 64, minWidth: 64, flexShrink: 0, height: '100vh' }} />

      {/* Floating overlay sidebar */}
      <motion.aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        animate={{ width: sidebarW }}
        initial={false}
        transition={{ type: 'spring', stiffness: 350, damping: 32 }}
        style={{
          background: '#16213e',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000,
          flexShrink: 0,
          boxShadow: hovered ? '10px 0 35px rgba(0, 0, 0, 0.45)' : 'none',
          transition: 'box-shadow 0.3s ease',
        }}
      >
        {/* ─── Brand Header ─── */}
        <div style={{
          padding: '0 14px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {/* Logo with fixed width container */}
          <div style={{
            width: 36,
            height: 36,
            minWidth: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #ef4444, #f97316)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(239,68,68,0.4)',
            flexShrink: 0,
          }}>
            <Flame size={18} />
          </div>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
              >
                <div style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1.2
                }}>
                  Tasty Bites
                </div>
                <div style={{
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  color: 'rgba(239,68,68,0.85)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginTop: 2
                }}>
                  Admin Console
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Navigation ─── */}
        <nav style={{
          flex: 1,
          padding: '0.875rem 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>
          {/* Section Label */}
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  fontSize: '0.58rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.22)',
                  padding: '0.25rem 14px 0.5rem',
                }}
              >
                Main Menu
              </motion.div>
            )}
          </AnimatePresence>

          {links.map((link, idx) => {
            const Icon = link.icon;
            const isActive = link.end
              ? location.pathname === link.to
              : location.pathname.startsWith(link.to);

            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                title={collapsed ? link.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '0' : '0.6rem 14px',
                  width: collapsed ? '44px' : '100%',
                  height: collapsed ? '44px' : 'auto',
                  borderRadius: 10,
                  textDecoration: 'none',
                  color: isActive ? '#ffffff' : 'rgba(160,174,192,0.85)',
                  background: isActive
                    ? 'linear-gradient(135deg, #ef4444, #f97316)'
                    : 'transparent',
                  boxShadow: isActive ? '0 4px 15px rgba(239,68,68,0.35)' : 'none',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.82rem',
                  transition: 'background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, width 0.2s ease',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(160,174,192,0.85)';
                  }
                }}
              >
                {/* Fixed width icon wrapper to align icons perfectly whether collapsed or expanded */}
                <div style={{
                  width: 36,
                  minWidth: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginRight: collapsed ? 0 : '0.75rem',
                }}>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    style={{ flexShrink: 0, display: 'flex' }}
                  >
                    <Icon size={17} />
                  </motion.div>
                </div>

                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.15, delay: idx * 0.02 }}
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {link.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
        </nav>

        {/* ─── Footer ─── */}
        <div style={{
          padding: '0.75rem 10px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          {/* Logout */}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            style={{
              width: collapsed ? '44px' : '100%',
              height: collapsed ? '44px' : 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '0' : '0.6rem 14px',
              margin: collapsed ? '0 auto' : '0',
              borderRadius: 10,
              border: 'none',
              background: 'transparent',
              fontSize: '0.82rem',
              fontWeight: 500,
              color: '#fc8181',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              transition: 'background 0.18s ease, color 0.18s ease, width 0.2s ease',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
              e.currentTarget.style.color = '#f87171';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#fc8181';
            }}
          >
            {/* Fixed width icon wrapper for alignment */}
            <div style={{
              width: 36,
              minWidth: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginRight: collapsed ? 0 : '0.75rem',
            }}>
              <LogOut size={16} style={{ flexShrink: 0 }} />
            </div>

            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
