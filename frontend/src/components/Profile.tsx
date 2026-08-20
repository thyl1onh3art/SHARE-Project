import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  age?: number;
  interests?: string[];
  createdAt?: string;
}

const Profile: React.FC = () => {
  const { updateProfile, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    interests: ''
  });

  useEffect(() => {
    fetchProfile();
    // Intentionally load once on mount; fetchProfile closes over stable auth helpers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/users/me');
      const userData = response.data.user;
      setProfile({
        id: userData.id || userData._id,
        name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'User',
        email: userData.email,
        age: userData.age,
        interests: userData.interests,
        createdAt: userData.createdAt
      });
      setFormData({
        name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || '',
        email: userData.email || '',
        age: userData.age ? userData.age.toString() : '',
        interests: userData.interests ? userData.interests.join(', ') : ''
      });
      await refreshUser();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const interestsArray = formData.interests
        .split(',')
        .map(interest => interest.trim())
        .filter(interest => interest.length > 0);

      await updateProfile({
        name: formData.name.trim(),
        age: parseInt(formData.age) || undefined,
        interests: interestsArray
      });

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      await fetchProfile(); // Refresh profile data
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setSuccess('');
    // Reset form data to current profile
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        age: profile.age ? profile.age.toString() : '',
        interests: profile.interests ? profile.interests.join(', ') : ''
      });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem', color: '#4a5568' }}>Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem', color: '#e53e3e' }}>Failed to load profile</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '2rem', 
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' 
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '2rem' 
        }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: '#2d3748',
            margin: 0
          }}>
            Profile Settings
          </h1>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-primary"
              style={{ padding: '10px 20px' }}
            >
              Edit Profile
            </button>
          )}
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

        {success && (
          <div style={{
            background: '#c6f6d5',
            color: '#2f855a',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: '1px solid #9ae6b4'
          }}>
            {success}
          </div>
        )}

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              color: '#4a5568',
              marginBottom: '0.5rem'
            }}>
              Full Name
            </label>
            {isEditing ? (
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
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
            ) : (
              <div style={{
                padding: '0.75rem',
                background: '#f7fafc',
                borderRadius: '8px',
                fontSize: '1rem',
                color: '#2d3748'
              }}>
                {profile.name || 'Not provided'}
              </div>
            )}
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              color: '#4a5568',
              marginBottom: '0.5rem'
            }}>
              Email Address
            </label>
            <div style={{
              padding: '0.75rem',
              background: '#f7fafc',
              borderRadius: '8px',
              fontSize: '1rem',
              color: '#2d3748'
            }}>
              {profile.email}
            </div>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#718096', 
              marginTop: '0.25rem' 
            }}>
              Email cannot be changed
            </div>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              color: '#4a5568',
              marginBottom: '0.5rem'
            }}>
              Age
            </label>
            {isEditing ? (
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                min="13"
                max="120"
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
            ) : (
              <div style={{
                padding: '0.75rem',
                background: '#f7fafc',
                borderRadius: '8px',
                fontSize: '1rem',
                color: '#2d3748'
              }}>
                {profile.age || 'Not provided'}
              </div>
            )}
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              color: '#4a5568',
              marginBottom: '0.5rem'
            }}>
              Interests
            </label>
            {isEditing ? (
              <textarea
                name="interests"
                value={formData.interests}
                onChange={handleInputChange}
                placeholder="Enter interests separated by commas (e.g., Technology, Sports, Music)"
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  resize: 'vertical',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            ) : (
              <div style={{
                padding: '0.75rem',
                background: '#f7fafc',
                borderRadius: '8px',
                fontSize: '1rem',
                color: '#2d3748',
                minHeight: '60px'
              }}>
                {profile.interests && profile.interests.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {profile.interests.map((interest, index) => (
                      <span
                        key={index}
                        style={{
                          background: '#667eea',
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.875rem'
                        }}
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : (
                  'No interests specified'
                )}
              </div>
            )}
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              color: '#4a5568',
              marginBottom: '0.5rem'
            }}>
              Member Since
            </label>
            <div style={{
              padding: '0.75rem',
              background: '#f7fafc',
              borderRadius: '8px',
              fontSize: '1rem',
              color: '#2d3748'
            }}>
              {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
            </div>
          </div>
        </div>

        {isEditing && (
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginTop: '2rem',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={handleCancel}
              className="btn btn-secondary"
              style={{ padding: '10px 20px' }}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary"
              style={{ padding: '10px 20px' }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
