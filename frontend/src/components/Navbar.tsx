import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const primaryLinks = [
  { to: '/events', label: 'Shared Accounts' },
  { to: '/invitations', label: 'Notifications' },
];

const moreLinks = [
  { to: '/friends', label: 'Friends' },
  { to: '/personal-finance', label: 'Personal tracking' },
  { to: '/financial-records', label: 'Activity history' },
  { to: '/calendar', label: 'Calendar' },
];

const dropdownLinkStyle: React.CSSProperties = {
  display: 'block',
  padding: '0.75rem 1rem',
  color: '#4a5568',
  textDecoration: 'none',
  fontSize: '0.875rem',
  transition: 'background-color 0.2s',
  whiteSpace: 'nowrap',
};

const settlementBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '1.1rem',
  height: '1.1rem',
  marginLeft: '0.35rem',
  padding: '0 0.3rem',
  borderRadius: '999px',
  background: '#c05621',
  color: '#fff',
  fontSize: '0.7rem',
  fontWeight: 600,
  lineHeight: 1,
};

const invitationBadgeStyle: React.CSSProperties = {
  ...settlementBadgeStyle,
  background: '#2b6cb0',
};

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settlementActionCount, setSettlementActionCount] = useState(0);
  const [invitationUnreadCount, setInvitationUnreadCount] = useState(0);
  const profileRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (!user) {
      setSettlementActionCount(0);
      setInvitationUnreadCount(0);
      return;
    }

    let cancelled = false;
    const loadAttentionCounts = async () => {
      try {
        const [settlementResponse, inviteResponse] = await Promise.all([
          axios.get('/payment-requests/unread-count'),
          axios.get('/invites/unread-count')
        ]);
        if (!cancelled) {
          setSettlementActionCount(Number(settlementResponse.data?.count) || 0);
          setInvitationUnreadCount(Number(inviteResponse.data?.count) || 0);
        }
      } catch {
        if (!cancelled) {
          setSettlementActionCount(0);
          setInvitationUnreadCount(0);
        }
      }
    };

    loadAttentionCounts();
    const intervalId = window.setInterval(loadAttentionCounts, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [user, location.pathname]);

  const closeAllMenus = () => {
    setShowProfileDropdown(false);
    setShowMoreDropdown(false);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setShowProfileDropdown(false);
      }
      if (moreRef.current && !moreRef.current.contains(target)) {
        setShowMoreDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderDropdownItem = (to: string, label: string, onNavigate?: () => void) => (
    <Link
      key={to}
      to={to}
      onClick={() => {
        onNavigate?.();
        closeAllMenus();
      }}
      style={dropdownLinkStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f7fafc';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {label}
    </Link>
  );

  return (
    <nav className="share-nav">
      <div className="share-nav-inner">
        <Link
          to="/"
          className="share-nav-brand"
          aria-label="SHARE — Home"
          onClick={closeAllMenus}
        >
          SHARE
        </Link>

        {user ? (
          <>
            <div className="share-nav-desktop">
              <div className="share-nav-primary">
                {primaryLinks.map((link) => (
                  <Link key={link.to} to={link.to} className="share-nav-link">
                    {link.label}
                    {link.to === '/events' && settlementActionCount > 0 && (
                      <span
                        style={settlementBadgeStyle}
                        aria-label={`${settlementActionCount} payment requests awaiting your review`}
                      >
                        {settlementActionCount > 9 ? '9+' : settlementActionCount}
                      </span>
                    )}
                    {link.to === '/invitations' && invitationUnreadCount > 0 && (
                      <span
                        style={invitationBadgeStyle}
                        aria-label={`${invitationUnreadCount} unread invitations`}
                      >
                        {invitationUnreadCount > 9 ? '9+' : invitationUnreadCount}
                      </span>
                    )}
                  </Link>
                ))}

                <div className="share-nav-dropdown" ref={moreRef}>
                  <button
                    type="button"
                    className="share-nav-link share-nav-menu-btn"
                    aria-expanded={showMoreDropdown}
                    aria-haspopup="true"
                    onClick={() => {
                      setShowMoreDropdown((open) => !open);
                      setShowProfileDropdown(false);
                    }}
                  >
                    More <span className="share-nav-caret">▼</span>
                  </button>
                  {showMoreDropdown && (
                    <div className="share-nav-menu" role="menu">
                      {moreLinks.map((link) => renderDropdownItem(link.to, link.label))}
                    </div>
                  )}
                </div>
              </div>

              <div className="share-nav-dropdown" ref={profileRef}>
                <button
                  type="button"
                  className="share-nav-profile-btn"
                  aria-expanded={showProfileDropdown}
                  aria-haspopup="true"
                  onClick={() => {
                    setShowProfileDropdown((open) => !open);
                    setShowMoreDropdown(false);
                  }}
                >
                  <span>{user.name}</span>
                  <span className="share-nav-caret">▼</span>
                </button>
                {showProfileDropdown && (
                  <div className="share-nav-menu share-nav-menu-right" role="menu">
                    <div className="share-nav-user-meta">
                      <div className="share-nav-user-name">{user.name}</div>
                      <div className="share-nav-user-email">{user.email}</div>
                    </div>
                    {renderDropdownItem('/profile', 'Edit Profile')}
                    {renderDropdownItem('/settings', 'Settings')}
                    <div className="share-nav-menu-divider" />
                    <button
                      type="button"
                      className="share-nav-logout"
                      onClick={() => {
                        closeAllMenus();
                        handleLogout();
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              className="share-nav-hamburger"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </>
        ) : (
          <div className="share-nav-auth">
            <Link to="/login" className="share-nav-link share-nav-link-primary">
              Login
            </Link>
            <Link to="/register" className="share-nav-link">
              Register
            </Link>
          </div>
        )}
      </div>

      {user && mobileMenuOpen && (
        <div className="share-nav-mobile-panel">
          <p className="share-nav-section-label">Primary</p>
          {primaryLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="share-nav-mobile-link"
              onClick={closeAllMenus}
            >
              {link.label}
              {link.to === '/events' && settlementActionCount > 0 && (
                <span
                  style={settlementBadgeStyle}
                  aria-label={`${settlementActionCount} payment requests awaiting your review`}
                >
                  {settlementActionCount > 9 ? '9+' : settlementActionCount}
                </span>
              )}
              {link.to === '/invitations' && invitationUnreadCount > 0 && (
                <span
                  style={invitationBadgeStyle}
                  aria-label={`${invitationUnreadCount} unread invitations`}
                >
                  {invitationUnreadCount > 9 ? '9+' : invitationUnreadCount}
                </span>
              )}
            </Link>
          ))}

          <p className="share-nav-section-label">More</p>
          {moreLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="share-nav-mobile-link"
              onClick={closeAllMenus}
            >
              {link.label}
            </Link>
          ))}

          <p className="share-nav-section-label">Account</p>
          <Link to="/profile" className="share-nav-mobile-link" onClick={closeAllMenus}>
            Edit Profile
          </Link>
          <Link to="/settings" className="share-nav-mobile-link" onClick={closeAllMenus}>
            Settings
          </Link>
          <button
            type="button"
            className="share-nav-mobile-logout"
            onClick={() => {
              closeAllMenus();
              handleLogout();
            }}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
