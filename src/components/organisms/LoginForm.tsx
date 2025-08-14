/**
 * Login form component for Mattermost server authentication
 * Provides server URL, username/email, and password input with validation
 */
import React, { useState } from 'react';
import { Box, Card, Typography, Alert } from '@mui/material';
import { Button, TextInput } from '../atoms';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { handleError } from '../../services/errorService';
import { selectIsLoggingIn, selectLoginError } from '../../store/selectors';
import { loginUser } from '../../store/slices/authSlice';

export interface LoginFormProps {
  onSuccess?: () => void;
  className?: string;
}


const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const dispatch = useAppDispatch();
  const isLoggingIn = useAppSelector(selectIsLoggingIn);
  const loginError = useAppSelector(selectLoginError);
  
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
      // Handle error with proper logging and user feedback
      handleError(error, {
        component: 'LoginForm',
        action: 'login',
        showToast: true
      });
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear field error when user starts typing
    if (fieldErrors[field as keyof typeof fieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };


  return (
    <Box sx={{ 
      maxWidth: { xs: '100%', sm: 400 }, 
      margin: '0 auto', 
      p: { xs: 1, sm: 2.5 },
      minHeight: { xs: '100vh', sm: 'auto' },
      display: { xs: 'flex', sm: 'block' },
      alignItems: { xs: 'center', sm: 'flex-start' }
    }}>
      <Card sx={{ 
        p: { xs: 3, sm: 4 }, 
        borderRadius: { xs: 2, sm: 2 },
        width: '100%',
        maxWidth: { xs: 400, sm: 'none' }
      }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Sign in to Mattermost
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Connect to your Mattermost server
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <TextInput
            label="Server URL"
            type="url"
            placeholder="https://your-mattermost-server.com"
            value={formData.serverUrl}
            onChange={handleChange('serverUrl')}
            error={!!fieldErrors.serverUrl}
            helperText={fieldErrors.serverUrl}
            disabled={isLoggingIn}
            required
          />

          <TextInput
            label="Email or Username"
            type="text"
            placeholder="Enter your email or username"
            value={formData.loginId}
            onChange={handleChange('loginId')}
            error={!!fieldErrors.loginId}
            helperText={fieldErrors.loginId}
            disabled={isLoggingIn}
            required
          />

          <TextInput
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange('password')}
            error={!!fieldErrors.password}
            helperText={fieldErrors.password}
            disabled={isLoggingIn}
            required
          />

          {loginError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {loginError}
            </Alert>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isLoggingIn}
            sx={{ width: '100%' }}
          >
            {isLoggingIn ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="caption" color="text.secondary">
            Make sure your Mattermost server is accessible and you have valid credentials
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

export default LoginForm;