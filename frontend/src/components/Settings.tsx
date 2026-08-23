import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Settings: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type "DELETE" to confirm account deletion');
      return;
    }

    try {
      setDeleting(true);
      setError('');

      await axios.delete('/users/account');
      
      // Logout and redirect
      logout();
      navigate('/login');
      
      // Show success message (though user will be redirected)
      alert('Account deleted successfully');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteConfirmText('');
    setError('');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '2rem', 
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' 
      }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 'bold', 
          color: '#2d3748',
          marginBottom: '2rem'
        }}>
          Account Settings
        </h1>

        <div style={{ display: 'grid', gap: '2rem' }}>
          {/* Security Section */}
          <div style={{
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: '#f7fafc'
          }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              color: '#2d3748',
              marginBottom: '1rem'
            }}>
              Security
            </h2>
            <p style={{ color: '#4a5568', marginBottom: '1rem' }}>
              Manage your account security and privacy settings.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                Change Password
              </button>
              <button className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                Two-Factor Authentication
              </button>
            </div>
          </div>

          {/* Privacy Section */}
          <div style={{
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: '#f7fafc'
          }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              color: '#2d3748',
              marginBottom: '1rem'
            }}>
              Privacy
            </h2>
            <p style={{ color: '#4a5568', marginBottom: '1rem' }}>
              Control your privacy and data sharing preferences.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                Data Export
              </button>
              <button className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                Privacy Settings
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div style={{
            padding: '1.5rem',
            border: '2px solid #fed7d7',
            borderRadius: '8px',
            background: '#fff5f5'
          }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              color: '#c53030',
              marginBottom: '1rem'
            }}>
              Danger Zone
            </h2>
            <p style={{ color: '#4a5568', marginBottom: '1rem' }}>
              These actions are irreversible. Please proceed with caution.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-danger"
              style={{ padding: '10px 20px' }}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              color: '#c53030',
              marginBottom: '1rem'
            }}>
              Delete Account
            </h2>
            
            <div style={{
              background: '#fed7d7',
              border: '1px solid #feb2b2',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{ color: '#c53030', margin: 0, fontWeight: '600' }}>
                This action cannot be undone!
              </p>
              <p style={{ color: '#c53030', margin: '0.5rem 0 0 0' }}>
                This will permanently delete your account and all associated data including:
              </p>
              <ul style={{ color: '#c53030', margin: '0.5rem 0 0 1rem' }}>
                <li>Your profile information</li>
                <li>Shared Account and personal activity records</li>
                <li>Shared Account memberships</li>
                <li>Invitations and notifications</li>
              </ul>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: '#4a5568',
                marginBottom: '0.5rem'
              }}>
                To confirm, type <strong>DELETE</strong> in the box below:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {error && (
              <div style={{
                background: '#fed7d7',
                color: '#c53030',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '1px solid #feb2b2'
              }}>
                {error}
              </div>
            )}

            <div style={{ 
              display: 'flex', 
              gap: '1rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={closeDeleteModal}
                className="btn btn-secondary"
                style={{ padding: '10px 20px' }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="btn btn-danger"
                style={{ padding: '10px 20px' }}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
