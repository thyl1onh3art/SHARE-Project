import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
            <Link to="/invitations" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
              Invitations
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
