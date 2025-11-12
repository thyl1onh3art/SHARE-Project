import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// import EmailVerification from './EmailVerification'; // Temporarily disabled

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    ageGroup: '',
    interests: [] as string[]
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // const [showEmailVerification, setShowEmailVerification] = useState(false); // Temporarily disabled
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAgeGroupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      ageGroup: e.target.value
    });
  };

  const handleInterestChange = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate age group is selected
    if (!formData.ageGroup) {
      setError('Please select an age group');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    // Check password requirements
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(formData.password)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return;
    }

    // Register directly (email verification temporarily disabled)
    setLoading(true);
    try {
      // Convert age group to a representative age for backend compatibility
      const ageMap: { [key: string]: number } = {
        '16-20': 18,
        '21-25': 23,
        '26-30': 28,
        '31-35': 33,
        '36-40': 38,
        '40+': 45
      };
      const age = ageMap[formData.ageGroup];
      
      if (!age) {
        setError('Invalid age group selected');
        setLoading(false);
        return;
      }
      
      // Register user directly
      await register(
        formData.name,
        formData.email,
        formData.password,
        age,
        formData.interests
      );
      
      // Redirect to login on success
      navigate('/login');
    } catch (err: any) {
      // Display validation errors if available
      const errorMessage = err.response?.data?.errors 
        ? err.response.data.errors.map((e: any) => e.message || e).join(', ')
        : err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Email verification handlers temporarily disabled
  // const handleVerificationComplete = async () => {
  //   setLoading(true);
  //   setError('');
  //   try {
  //     const pendingData = (window as any).pendingRegistration;
  //     if (!pendingData) {
  //       throw new Error('Registration data not found');
  //     }
  //     await register(
  //       pendingData.name,
  //       pendingData.email,
  //       pendingData.password,
  //       pendingData.age,
  //       pendingData.interests
  //     );
  //     delete (window as any).pendingRegistration;
  //     navigate('/login');
  //   } catch (err: any) {
  //     const errorMessage = err.response?.data?.errors 
  //       ? err.response.data.errors.map((e: any) => e.message || e).join(', ')
  //       : err.response?.data?.message || err.message || 'Registration failed';
  //     setError(errorMessage);
  //     setShowEmailVerification(false);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const handleBackToRegistration = () => {
  //   setShowEmailVerification(false);
  //   setError('');
  //   delete (window as any).pendingRegistration;
  // };

  // if (showEmailVerification) {
  //   return (
  //     <EmailVerification
  //       email={formData.email}
  //       onVerificationComplete={handleVerificationComplete}
  //       onBack={handleBackToRegistration}
  //     />
  //   );
  // }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '80vh'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
        <div className="card-header">
          <h2 className="card-title">Join SHARE Project</h2>
        </div>
        
        {error && (
          <div className="alert alert-error" style={{ 
            marginBottom: '1rem',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#fed7d7',
            border: '1px solid #feb2b2',
            color: '#742a2a',
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Age Group</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
              {[
                { value: '16-20', label: '16-20' },
                { value: '21-25', label: '21-25' },
                { value: '26-30', label: '26-30' },
                { value: '31-35', label: '31-35' },
                { value: '36-40', label: '36-40' },
                { value: '40+', label: '40+' }
              ].map((ageGroup) => (
                <label key={ageGroup.value} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0.5rem', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: formData.ageGroup === ageGroup.value ? '#667eea' : 'white',
                  color: formData.ageGroup === ageGroup.value ? 'white' : '#4a5568',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="radio"
                    name="ageGroup"
                    value={ageGroup.value}
                    checked={formData.ageGroup === ageGroup.value}
                    onChange={handleAgeGroupChange}
                    required
                    style={{ marginRight: '0.5rem' }}
                  />
                  {ageGroup.label}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Interests</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
              {[
                'Finance',
                'Technology',
                'Travel',
                'Sports',
                'Music',
                'Art',
                'Cooking',
                'Reading',
                'Gaming',
                'Fitness',
                'Photography',
                'Movies'
              ].map((interest) => (
                <label key={interest} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0.5rem', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: formData.interests.includes(interest) ? '#667eea' : 'white',
                  color: formData.interests.includes(interest) ? 'white' : '#4a5568',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.interests.includes(interest)}
                    onChange={() => handleInterestChange(interest)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  {interest}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                className="form-input password-input"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            <div style={{ 
              fontSize: '0.85rem', 
              color: '#6b7280', 
              marginTop: '0.5rem',
              marginBottom: 0,
              padding: '8px 12px',
              backgroundColor: '#f7fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}>
              <strong>Password Requirements:</strong>
              <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                <li>At least 8 characters long</li>
                <li>Contains at least one uppercase letter (A-Z)</li>
                <li>Contains at least one lowercase letter (a-z)</li>
                <li>Contains at least one number (0-9)</li>
              </ul>
              <p style={{ margin: '4px 0 0 0', fontStyle: 'italic' }}>
                Example: Test1234
              </p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                className="form-input password-input"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginBottom: '1rem' }}
          >
            {loading ? <span className="spinner"></span> : 'Register'}
          </button>
        </form>

        <div className="text-center">
          <p style={{ color: '#4a5568' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#667eea', textDecoration: 'none' }}>
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
