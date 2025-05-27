import React, { useState } from 'react';
import { Button, TextInput } from '../atoms';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { loginUser } from '../../store/slices/authSlice';

export interface LoginFormProps {
  onSuccess?: () => void;
  className?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, className = '' }) => {
  const dispatch = useAppDispatch();
  const { isLoggingIn, loginError } = useAppSelector(state => state.views.auth);
  
  const [formData, setFormData] = useState({
    serverUrl: '',
    loginId: '',
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState({
    serverUrl: '',
    loginId: '',
    password: '',
  });

  const validateForm = (): boolean => {
    const errors = {
      serverUrl: '',
      loginId: '',
      password: '',
    };

    if (!formData.serverUrl.trim()) {
      errors.serverUrl = 'Server URL is required';
    } else if (!formData.serverUrl.match(/^https?:\/\/.+/)) {
      errors.serverUrl = 'Please enter a valid URL (http:// or https://)';
    }

    if (!formData.loginId.trim()) {
      errors.loginId = 'Email or username is required';
    }

    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    }

    setFieldErrors(errors);
    return !Object.values(errors).some(error => error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const result = await dispatch(loginUser({
        login_id: formData.loginId,
        password: formData.password,
        serverUrl: formData.serverUrl,
      }));

      if (loginUser.fulfilled.match(result)) {
        onSuccess?.();
      }
    } catch (error) {
      // Error is handled by the auth slice
      console.error('Login failed:', error);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear field error when user starts typing
    if (fieldErrors[field as keyof typeof fieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '400px',
    margin: '0 auto',
    padding: '20px',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    padding: '32px',
  };

  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '24px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 8px 0',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  };

  const errorBoxStyle: React.CSSProperties = {
    backgroundColor: '#ffebee',
    border: '1px solid #ffcdd2',
    borderRadius: '4px',
    padding: '12px',
    marginBottom: '16px',
  };

  const errorTextStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#d32f2f',
    margin: 0,
  };

  const footerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginTop: '24px',
  };

  const footerTextStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#999',
    margin: 0,
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Sign in to Mattermost</h2>
          <p style={subtitleStyle}>
            Connect to your Mattermost server
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <TextInput
            label="Server URL"
            type="url"
            placeholder="https://your-mattermost-server.com"
            value={formData.serverUrl}
            onChange={handleChange('serverUrl')}
            error={fieldErrors.serverUrl}
            disabled={isLoggingIn}
            required
          />

          <TextInput
            label="Email or Username"
            type="text"
            placeholder="Enter your email or username"
            value={formData.loginId}
            onChange={handleChange('loginId')}
            error={fieldErrors.loginId}
            disabled={isLoggingIn}
            required
          />

          <TextInput
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange('password')}
            error={fieldErrors.password}
            disabled={isLoggingIn}
            required
          />

          {loginError && (
            <div style={errorBoxStyle}>
              <p style={errorTextStyle}>{loginError}</p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isLoggingIn}
            style={{ width: '100%' }}
          >
            {isLoggingIn ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div style={footerStyle}>
          <p style={footerTextStyle}>
            Make sure your Mattermost server is accessible and you have valid credentials
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;