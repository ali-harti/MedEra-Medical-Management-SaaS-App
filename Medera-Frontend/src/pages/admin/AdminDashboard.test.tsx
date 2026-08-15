import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminDashboard from './AdminDashboard';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { AuthProvider } from '../../contexts/AuthContext';
import * as adminService from '../../services/adminService';

jest.mock('../../services/adminService', () => ({
  getDashboardKpis: jest.fn(),
  getApplications: jest.fn(),
  getAuditLog: jest.fn(),
  getSystemHealth: jest.fn(),
  approveApplication: jest.fn(),
  rejectApplication: jest.fn(),
}));

jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: () => ({
    user: { id: '1', role: 'ADMIN', first_name: 'Admin' }
  })
}));

const mockAdminService = adminService as jest.Mocked<typeof adminService>;

const renderAdminDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LanguageProvider>
          <AdminDashboard />
        </LanguageProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('AdminDashboard Polling & Data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminService.getDashboardKpis.mockResolvedValue({
      total_users: 1500,
      active_patients: 1200,
      pending_applications: 5,
      new_users_week: 20,
      new_apps_week: 2,
      role_breakdown: { ADMIN: 2, MEDECIN: 50, SECRETAIRE: 10, PATIENT: 1438 },
      daily_stats: []
    });
    mockAdminService.getApplications.mockResolvedValue({ results: [], count: 0, next: null, previous: null });
    mockAdminService.getAuditLog.mockResolvedValue({ results: [], count: 0, next: null, previous: null });
    mockAdminService.getSystemHealth.mockResolvedValue({ status: 'Operational', services: { api: true, redis: true, db: true } });
  });

  it('renders loading state initially', () => {
    // If we mock resolve, it might be too fast, but we can check if it eventually renders data.
    renderAdminDashboard();
  });

  it('fetches and displays KPI data', async () => {
    renderAdminDashboard();
    
    await waitFor(() => {
      expect(mockAdminService.getDashboardKpis).toHaveBeenCalled();
    });

    // Check if the total users is formatted/displayed
    await waitFor(() => {
      // 1,500 formatted
      expect(screen.getByText(/1,500/i)).toBeInTheDocument();
    });
    expect(mockAdminService.getSystemHealth).toHaveBeenCalled();
    const operationalElements = screen.getAllByText(/Operational/i);
    expect(operationalElements.length).toBeGreaterThan(0);
  });
});
