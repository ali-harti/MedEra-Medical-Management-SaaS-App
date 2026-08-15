import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import GenericPage from './pages/GenericPage';
import LoginPage from './pages/LoginPage';
import RoleSelectionPage from './pages/RoleSelectionPage';
import PatientSignupPage from './pages/PatientSignupPage';
import DoctorOnboardingPage from './pages/DoctorOnboardingPage';
import DoctorPendingPage from './pages/DoctorPendingPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminApplicationsPage from './pages/admin/AdminApplicationsPage';
import AdminAppointmentsPage from './pages/admin/AdminAppointmentsPage';
import AdminAuditPage from './pages/admin/AdminAuditPage';
import AdminCabinetPage from './pages/admin/AdminCabinetPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import PatientLayout from './pages/patient/PatientLayout';
import PatientDashboard from './pages/patient/PatientDashboard';
import PatientFindDoctor from './pages/patient/PatientFindDoctor';
import PatientAppointments from './pages/patient/PatientAppointments';
import PatientConsultations from './pages/patient/PatientConsultations';
import PatientPrescriptions from './pages/patient/PatientPrescriptions';
import PatientBilling from './pages/patient/PatientBilling';
import PatientMessages from './pages/patient/PatientMessages';
import PatientDemands from './pages/patient/PatientDemands';
import PatientSettings from './pages/patient/PatientSettings';
import PatientHealthOnboarding from './pages/patient/PatientHealthOnboarding';
import DoctorLayout from './pages/doctor/DoctorLayout';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorPatients from './pages/doctor/DoctorPatients';
import DoctorAppointments from './pages/doctor/DoctorAppointments';
import DoctorConsultations from './pages/doctor/DoctorConsultations';
import DoctorActiveConsultation from './pages/doctor/DoctorActiveConsultation';
import DoctorPrescriptions from './pages/doctor/DoctorPrescriptions';
import DoctorBilling from './pages/doctor/DoctorBilling';
import DoctorMessages from './pages/doctor/DoctorMessages';
import DoctorSettings from './pages/doctor/DoctorSettings';
import SecretaryLayout from './pages/secretary/SecretaryLayout';
import SecretaryDashboard from './pages/secretary/SecretaryDashboard';
import SecretaryPatients from './pages/secretary/SecretaryPatients';
import SecretaryAppointments from './pages/secretary/SecretaryAppointments';
import SecretaryWaitingRoom from './pages/secretary/SecretaryWaitingRoom';
import SecretaryBilling from './pages/secretary/SecretaryBilling';
import SecretaryMessages from './pages/secretary/SecretaryMessages';
import SecretarySettings from './pages/secretary/SecretarySettings';
import SecretaryDemands from './pages/secretary/SecretaryDemands';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './components/Toast';
import { RouteGuard } from './components/guards/RouteGuard';
import DoctorRegister from './pages/auth/DoctorRegister';
import SecretarySignup from './pages/auth/SecretarySignup';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Admin Routes */}
            <Route path="/admin" element={<RouteGuard allowedRole="ADMIN"><AdminLayout /></RouteGuard>}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="appointments" element={<AdminAppointmentsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="applications" element={<AdminApplicationsPage />} />
              <Route path="audit" element={<AdminAuditPage />} />
              <Route path="cabinet" element={<AdminCabinetPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Patient Routes */}
            <Route path="/patient/onboarding/health" element={<RouteGuard allowedRole="PATIENT"><PatientHealthOnboarding /></RouteGuard>} />
            <Route path="/patient" element={<RouteGuard allowedRole="PATIENT"><PatientLayout /></RouteGuard>}>
              <Route path="dashboard" element={<PatientDashboard />} />
              <Route path="find-doctor" element={<PatientFindDoctor />} />
              <Route path="appointments" element={<PatientAppointments />} />
              <Route path="consultations" element={<PatientConsultations />} />
              <Route path="prescriptions" element={<PatientPrescriptions />} />
              <Route path="billing" element={<PatientBilling />} />
              <Route path="demands" element={<PatientDemands />} />
              <Route path="messages" element={<PatientMessages />} />
              <Route path="settings" element={<PatientSettings />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Doctor Routes */}
            <Route path="/doctor" element={<RouteGuard allowedRole="MEDECIN"><DoctorLayout /></RouteGuard>}>
              <Route path="dashboard" element={<DoctorDashboard />} />
              <Route path="patients" element={<DoctorPatients />} />
              <Route path="appointments" element={<DoctorAppointments />} />
              <Route path="consultations" element={<DoctorConsultations />} />
              <Route path="active-consultation/:id" element={<DoctorActiveConsultation />} />
              <Route path="prescriptions" element={<DoctorPrescriptions />} />
              <Route path="billing" element={<DoctorBilling />} />
              <Route path="messages" element={<DoctorMessages />} />
              <Route path="settings" element={<DoctorSettings />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Secretary Routes */}
            <Route path="/secretary" element={<RouteGuard allowedRole="SECRETAIRE"><SecretaryLayout /></RouteGuard>}>
              <Route path="dashboard" element={<SecretaryDashboard />} />
              <Route path="patients" element={<SecretaryPatients />} />
              <Route path="appointments" element={<SecretaryAppointments />} />
              <Route path="demands" element={<SecretaryDemands />} />
              <Route path="waiting-room" element={<SecretaryWaitingRoom />} />
              <Route path="billing" element={<SecretaryBilling />} />
              <Route path="messages" element={<SecretaryMessages />} />
              <Route path="settings" element={<SecretarySettings />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            <Route path="/login" element={<LoginPage />} />
            <Route path="/get-started" element={<RoleSelectionPage />} />
            <Route path="/signup/patient" element={<PatientSignupPage />} />
            <Route path="/onboarding/doctor" element={<DoctorOnboardingPage />} />
            <Route path="/onboarding/pending" element={<DoctorPendingPage />} />
            <Route path="/register/doctor" element={<DoctorRegister />} />
            <Route path="/secretary-signup" element={<SecretarySignup />} />
            <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
            
            <Route path="/" element={<Layout />}>
              <Route index element={<LandingPage />} />
              <Route path="solutions" element={<GenericPage title="Solutions" />} />
              <Route path="features" element={<GenericPage title="Features" />} />
              <Route path="pricing" element={<GenericPage title="Pricing" />} />
              <Route path="security" element={<GenericPage title="Security" />} />
              <Route path="integrations" element={<GenericPage title="Integrations" />} />
              <Route path="releases" element={<GenericPage title="Releases" />} />
              <Route path="about" element={<GenericPage title="About Us" />} />
              <Route path="careers" element={<GenericPage title="Careers" />} />
              <Route path="privacy" element={<GenericPage title="Privacy Policy" />} />
              <Route path="contact" element={<GenericPage title="Contact Us" />} />
              <Route path="terms" element={<GenericPage title="Terms of Service" />} />
              <Route path="hipaa" element={<GenericPage title="HIPAA Compliance" />} />
              <Route path="security-audit" element={<GenericPage title="Security Audit" />} />
              <Route path="book-demo" element={<GenericPage title="Book a Demo" />} />
            </Route>
            <Route path="/unauthorized" element={<GenericPage title="Unauthorized Access" />} />
          </Routes>
        </BrowserRouter>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
