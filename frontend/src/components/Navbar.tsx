import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { MESSAGES_UNREAD_CHANGED, fetchUnreadMessageCount as getUnreadMessageCount } from '../utils/messageNotifications';
interface SharedAccountOption {
  _id: string;
  name: string;
}

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [sharedAccounts, setSharedAccounts] = useState<SharedAccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadMessageCount = useCallback(async () => {
    if (!user?.email) {
      setUnreadMessageCount(0);
      return;
    }

    try {
      const count = await getUnreadMessageCount(user.email, user.id);
      setUnreadMessageCount(count);
    } catch {
      setUnreadMessageCount(0);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchSharedAccounts = async () => {
      if (!user || !showProfileDropdown) return;
      try {
        setLoadingAccounts(true);
        const response = await axios.get('/shared-accounts');
        setSharedAccounts(response.data.map((account: SharedAccountOption) => ({
          _id: account._id,
          name: account.name
        })));
      } catch {
        setSharedAccounts([]);
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchSharedAccounts();
  }, [user, showProfileDropdown]);

  useEffect(() => {
    fetchUnreadMessageCount();
  }, [fetchUnreadMessageCount, location.pathname]);

  useEffect(() => {
    if (!user?.email) return undefined;

    const intervalId = window.setInterval(() => {
      fetchUnreadMessageCount();
    }, 30000);

    const handleFocus = () => {
      fetchUnreadMessageCount();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchUnreadMessageCount, user?.email]);

  useEffect(() => {
    const handleUnreadChange = () => {
      fetchUnreadMessageCount();
    };

    window.addEventListener(MESSAGES_UNREAD_CHANGED, handleUnreadChange);
    return () => window.removeEventListener(MESSAGES_UNREAD_CHANGED, handleUnreadChange);
  }, [fetchUnreadMessageCount]);

  const activeAccountId = location.pathname.startsWith('/shared-accounts/')
    ? location.pathname.split('/')[2]
    : null;

  const switchToAccount = (accountId: string) => {
    setShowProfileDropdown(false);
    navigate(`/shared-accounts/${accountId}`);
  };

  return (
    <nav style={{
      background: 'white',
      padding: '1rem 2rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <Link to="/" style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        textDecoration: 'none',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        SHARE Project
      </Link>
      
      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to="/personal-finance" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
              Finance
            </Link>
            <Link to="/shared-accounts" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
              Shared Accounts
            </Link>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <Link to="/messages" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
                Messages
              </Link>
              {unreadMessageCount > 0 && (
                <span
                  aria-label={`${unreadMessageCount} unread messages`}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    minWidth: '18px',
                    height: '18px',
                    padding: '0 5px',
                    borderRadius: '999px',
                    background: '#e53e3e',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 700,
                    lineHeight: '18px',
                    textAlign: 'center',
                    boxShadow: '0 0 0 2px white'
                  }}
                >
                  {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                </span>
              )}
            </span>
            <Link to="/friends" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
              Friends
            </Link>
            <Link to="/events" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
              Events
            </Link>
            <Link to="/calendar" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
              Calendar
            </Link>
            <Link to="/gallery" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
              Gallery
            </Link>
            <Link to="/map" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
              Map
            </Link>
            <Link to="/accommodations" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
              Accommodations
            </Link>
          </div>
          
          {/* Profile Dropdown */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '8px 12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span>{user.name}</span>
              <span style={{ fontSize: '12px' }}>▼</span>
            </button>

            {showProfileDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e2e8f0',
                minWidth: '200px',
                zIndex: 1000
              }}>
                <div style={{ padding: '0.5rem 0' }}>
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: '0.875rem',
                    color: '#4a5568'
                  }}>
                    <div style={{ fontWeight: '600', color: '#2d3748' }}>{user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#718096' }}>{user.email}</div>
                  </div>
                  
                  <Link
                    to="/profile"
                    onClick={() => setShowProfileDropdown(false)}
                    style={{
                      display: 'block',
                      padding: '0.75rem 1rem',
                      color: '#4a5568',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f7fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Edit Profile
                  </Link>

                  <div style={{
                    padding: '0.5rem 1rem 0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#718096',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}>
                    Switch Account
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileDropdown(false);
                      navigate('/financial-records');
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.6rem 1rem',
                      background: !activeAccountId ? '#ebf4ff' : 'transparent',
                      border: 'none',
                      color: '#2b6cb0',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      fontWeight: !activeAccountId ? 600 : 400
                    }}
                  >
                    Personal Account
                  </button>

                  {loadingAccounts ? (
                    <div style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#718096' }}>
                      Loading accounts...
                    </div>
                  ) : sharedAccounts.length === 0 ? (
                    <div style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#718096' }}>
                      No shared accounts
                    </div>
                  ) : (
                    sharedAccounts.map((account) => (
                      <button
                        key={account._id}
                        type="button"
                        onClick={() => switchToAccount(account._id)}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '0.6rem 1rem',
                          background: activeAccountId === account._id ? '#ebf4ff' : 'transparent',
                          border: 'none',
                          color: '#2d3748',
                          textAlign: 'left',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          fontWeight: activeAccountId === account._id ? 600 : 400
                        }}
                        onMouseEnter={(e) => {
                          if (activeAccountId !== account._id) {
                            e.currentTarget.style.background = '#f7fafc';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (activeAccountId !== account._id) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        {account.name}
                      </button>
                    ))
                  )}

                  <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }}></div>
                  
                  <Link
                    to="/settings"
                    onClick={() => setShowProfileDropdown(false)}
                    style={{
                      display: 'block',
                      padding: '0.75rem 1rem',
                      color: '#4a5568',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f7fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Settings
                  </Link>
                  
                  <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }}></div>
                  
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      handleLogout();
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: 'none',
                      border: 'none',
                      color: '#e53e3e',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fed7d7'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/login" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>
            Login
          </Link>
          <Link to="/register" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
            Register
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
