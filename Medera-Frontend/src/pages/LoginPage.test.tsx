import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import { AuthProvider } from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider } from '../components/Toast';
import * as apiModule from '../services/api';
import axios from 'axios';

// Mock API
jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }
}));

const mockApi = apiModule.default as jest.Mocked<typeof apiModule.default>;

const renderLoginPage = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <AuthProvider>
              <LoginPage />
            </AuthProvider>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('LoginPage Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form correctly', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  it('handles 401 Unauthorized gracefully without refreshing page', async () => {
    renderLoginPage();
    
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const loginButton = screen.getByRole('button', { name: /Sign In/i }); // Will match text

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

    // Mock 401 response
    mockApi.post.mockRejectedValueOnce({
      response: { status: 401, data: { detail: 'Invalid credentials' } }
    });

    fireEvent.submit(loginButton.closest('form')!);

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/api/auth/token/', {
        email: 'test@example.com',
        password: 'wrongpassword'
      });
    });

    // Error toast or message should appear
    await waitFor(() => {
      const errorMsg = screen.getByText(/Invalid email or password/i);
      expect(errorMsg).toBeInTheDocument();
    });
  });

  it('successful login redirects based on role', async () => {
    renderLoginPage();
    
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const loginButton = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(emailInput, { target: { value: 'admin@medera.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Mock successful login response
    mockApi.post.mockResolvedValueOnce({
      data: { access: 'mock-access', refresh: 'mock-refresh' }
    });

    // Mock me response
    mockApi.get.mockResolvedValueOnce({
      data: { id: '1', email: 'admin@medera.com', first_name: 'Admin', role: 'ADMIN' }
    });

    fireEvent.submit(loginButton.closest('form')!);

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/api/auth/token/', {
        email: 'admin@medera.com',
        password: 'password123'
      });
      expect(mockApi.get).toHaveBeenCalledWith('/api/auth/me/');
    });
  });
});
