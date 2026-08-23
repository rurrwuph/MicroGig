import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import {
  IconLogo,
  IconDashboard,
  IconSearch,
  IconPlus,
  IconBriefcase,
  IconWallet,
  IconSettings,
  IconLogout,
  IconUser,
  IconSun,
  IconMoon,
  IconBell,
  IconCheck,
  IconAlert,
  IconAlertCircle,
  IconInfo
} from './Icons';

const Navbar = ({ user, setUser, theme = 'dark', toggleTheme }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Dropdown states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count')
      ]);
      setNotifications(listRes.data || []);
      setUnreadCount(countRes.data?.unreadCount || 0);
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // 30s poll
      return () => clearInterval(interval);
    }
  }, [user]);

  const markAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {
      // non-critical
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
      setUnreadCount(0);
    } catch {
      // non-critical
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead && !notif.read) {
      markAsRead(notif.id);
    }
    setNotifOpen(false);
    navigate('/my-assignments');
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';
  const isAdmin = user?.role === 'ROLE_ADMIN';
  const isClient = user?.role === 'ROLE_CLIENT';

  const clientLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: <IconDashboard size={15} /> },
    { path: '/jobs', label: 'Browse Jobs', icon: <IconSearch size={15} /> },
    { path: '/post-job', label: 'Post a Job', icon: <IconPlus size={15} /> },
    { path: '/my-assignments', label: 'My Posts', icon: <IconBriefcase size={15} /> },
    { path: '/wallet', label: 'Wallet', icon: <IconWallet size={15} /> },
  ];

  const freelancerLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: <IconDashboard size={15} /> },
    { path: '/jobs', label: 'Find Work', icon: <IconSearch size={15} /> },
    { path: '/my-assignments', label: 'My Work', icon: <IconBriefcase size={15} /> },
    { path: '/wallet', label: 'Earnings', icon: <IconWallet size={15} /> },
  ];

  const adminLinks = [
    { path: '/dashboard', label: 'Moderation Queue & Overview', icon: <IconAlert size={15} /> },
    { path: '/jobs', label: 'Marketplace Jobs', icon: <IconSearch size={15} /> },
  ];

  const links = isAdmin ? adminLinks : isClient ? clientLinks : freelancerLinks;
  const initials = user?.username ? user.username.charAt(0).toUpperCase() : '?';
  const balance = Number(user?.balance ?? 0);

  return (
    <nav className="navbar">
      {/* Logo */}
      <div className="navbar-logo" onClick={() => navigate(user ? '/dashboard' : '/login')}>
        <div className="logo-icon">
          <IconLogo size={20} />
        </div>
        <span className="logo-text">MicroGig</span>
      </div>

      {/* Nav Links */}
      {user && (
        <div className="navbar-links">
          {links.map(link => (
            <span
              key={link.path}
              className={`nav-link ${isActive(link.path)}`}
              onClick={() => navigate(link.path)}
            >
              <span>{link.icon}</span>
              {link.label}
            </span>
          ))}
        </div>
      )}

      {/* User Section & Profile Circle */}
      {user ? (
        <div className="navbar-user">
          {/* Notification Bell */}
          <div className="notif-bell-container" ref={notifRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="notif-bell-btn"
              onClick={() => {
                setNotifOpen(o => !o);
                if (!notifOpen) fetchNotifications();
              }}
              title="Notifications"
            >
              <IconBell size={18} />
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            {notifOpen && (
              <div className="notif-dropdown">
                <div className="notif-header">
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications</div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="notif-read-all-btn"
                      onClick={markAllAsRead}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="notif-list">
                  {notifications.length === 0 ? (
                    <div className="notif-empty">
                      <IconInfo size={20} style={{ opacity: 0.5, marginBottom: '0.35rem' }} />
                      <div>No notifications yet</div>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => {
                      const isUnread = !n.isRead && !n.read;
                      return (
                        <div
                          key={n.id}
                          className={`notif-item ${isUnread ? 'unread' : ''}`}
                          onClick={() => handleNotificationClick(n)}
                        >
                          <div className="notif-item-header">
                            <span className="notif-item-title">{n.title}</span>
                            {isUnread && <span className="notif-unread-dot" />}
                          </div>
                          <p className="notif-item-msg">{n.message}</p>
                          <div className="notif-item-time">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Balance chip */}
          {!isAdmin && (
            <div
              className="balance-chip"
              onClick={() => navigate('/wallet')}
              style={{ cursor: 'pointer' }}
              title={isClient ? 'Manage wallet and deposits' : 'View earnings and payouts'}
            >
              <IconWallet size={14} />
              ${balance.toFixed(2)}
            </div>
          )}

          {/* Profile Circle Avatar + Dropdown */}
          <div
            className="user-avatar"
            ref={dropdownRef}
            onClick={() => setDropdownOpen(o => !o)}
            title="Click for Profile Menu & Theme Toggle"
          >
            {initials}

            {dropdownOpen && (
              <div className="user-dropdown">
                <div className="user-dropdown-item" style={{ fontWeight: 700, color: 'var(--clr-text)' }}>
                  <IconUser size={15} />
                  <span>{user.fullName || user.username}</span>
                </div>
                {user.fullName && (
                  <div className="user-dropdown-item" style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', paddingBottom: 0 }}>
                    <span style={{ marginLeft: 23 }}>@{user.username}</span>
                  </div>
                )}
                <div className="user-dropdown-divider" />
                <div
                  className={`user-dropdown-item role-badge ${isAdmin ? 'admin' : isClient ? 'client' : 'freelancer'}`}
                  style={{ justifyContent: 'center', margin: '0.25rem 0' }}
                >
                  {isAdmin ? 'Administrator' : isClient ? 'Client Account' : 'Freelancer'}
                </div>

                <div
                  className="user-dropdown-item"
                  onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
                >
                  <IconSettings size={15} />
                  <span>Profile & Settings</span>
                </div>
                {!isAdmin && (
                  <div
                    className="user-dropdown-item"
                    onClick={() => { setDropdownOpen(false); navigate('/wallet'); }}
                  >
                    <IconWallet size={15} />
                    <span>{isClient ? 'Wallet & Deposit' : 'Earnings & Ledger'}</span>
                  </div>
                )}

                {/* ── Theme Switcher Item inside Profile Dropdown ── */}
                <div className="user-dropdown-divider" />
                <div
                  className="user-dropdown-item theme-toggle-dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (toggleTheme) toggleTheme();
                  }}
                  style={{ justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {theme === 'dark' ? (
                      <IconSun size={15} style={{ color: 'var(--clr-warning)' }} />
                    ) : (
                      <IconMoon size={15} style={{ color: 'var(--clr-primary)' }} />
                    )}
                    <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
                  </div>
                  <div className={`theme-switch-pill ${theme}`}>
                    <div className="theme-switch-thumb" />
                  </div>
                </div>

                <div className="user-dropdown-divider" />
                <div className="user-dropdown-item danger" onClick={handleLogout}>
                  <IconLogout size={15} />
                  <span>Sign Out</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Standalone Theme Toggle button when not signed in */
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={toggleTheme}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <IconSun size={15} /> : <IconMoon size={15} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
