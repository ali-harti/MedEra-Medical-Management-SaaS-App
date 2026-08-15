import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Stethoscope, Eye, EyeOff, AlertCircle, CheckCircle, Lock, User, Loader2 } from 'lucide-react';
import { authService } from '../../services/notificationService';

interface InviteInfo {
  valid: boolean;
  email: string;
  first_name: string;
  last_name: string;
  doctor_name: string;
}

export default function SecretarySignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [tokenLoading, setTokenLoading] = useState(true);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError('No invitation token found in URL.');
      setTokenLoading(false);
      return;
    }

    authService.validateInviteToken(token)
      .then((data: InviteInfo) => {
        if (data.valid) {
          setInviteInfo(data);
        } else {
          setTokenError(data.detail || 'Invalid token.');
        }
      })
      .catch(() => setTokenError('Invalid or expired invitation link.'))
      .finally(() => setTokenLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    try {
      setLoading(true);
      await authService.secretarySignup({ token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, string[] | string> } };
      const data = e?.response?.data;
      if (data) {
        const first = Object.values(data)[0];
        setError(Array.isArray(first) ? first[0] : String(first));
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (tokenLoading) {
    return (
      <div style={{ ...pageStyle, flexDirection: 'column', gap: '16px' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#6366F1' }} />
        <p style={{ color: '#94A3B8', margin: 0 }}>Validating your invitation...</p>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 40px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'rgba(239,68,68,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
          }}>
            <AlertCircle size={36} color="#EF4444" />
          </div>
          <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: '700' }}>Invalid Invitation</h2>
          <p style={{ color: '#94A3B8', margin: '0 0 24px', fontSize: '14px' }}>{tokenError}</p>
          <Link to="/login" style={{ color: '#6366F1', fontWeight: '600', textDecoration: 'none', fontSize: '14px' }}>
            Go to Login →
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 40px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'rgba(16,185,129,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
          }}>
            <CheckCircle size={36} color="#10B981" />
          </div>
          <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: '700' }}>
            Welcome to the Cabinet!
          </h2>
          <p style={{ color: '#94A3B8', margin: '0 0 8px', fontSize: '14px' }}>
            Your account has been created. You can now log in.
          </p>
          <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={gridBg} />
      <div style={cardStyle}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
          }}>
            <Stethoscope size={28} color="white" />
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            Accept Invitation
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '13px' }}>
            You were invited by{' '}
            <strong style={{ color: '#818CF8' }}>Dr. {inviteInfo?.doctor_name}</strong>
          </p>
        </div>

        {/* Invite summary card */}
        <div style={{
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '14px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(99,102,241,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User size={20} color="#818CF8" />
          </div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>
              {inviteInfo?.first_name} {inviteInfo?.last_name}
            </div>
            <div style={{ color: '#64748B', fontSize: '12px' }}>
              {inviteInfo?.email} · Secretary
            </div>
          </div>
        </div>

        {error && (
          <div style={errorStyle}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>
              <Lock size={14} style={{ color: '#6366F1' }} /> Set Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                style={{ ...inputStyle, paddingRight: '44px' }}
                placeholder="Create a strong password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', color: '#64748B',
                  display: 'flex', padding: 0,
                }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              <Lock size={14} style={{ color: '#6366F1' }} /> Confirm Password
            </label>
            <input
              type={showPw ? 'text' : 'password'}
              style={inputStyle}
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {/* Password strength hints */}
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '12px', color: '#64748B' }}>
            <li style={{ color: password.length >= 8 ? '#10B981' : '#64748B' }}>At least 8 characters</li>
            <li style={{ color: /[A-Z]/.test(password) ? '#10B981' : '#64748B' }}>One uppercase letter</li>
            <li style={{ color: /[0-9]/.test(password) ? '#10B981' : '#64748B' }}>One number</li>
          </ul>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px',
              background: loading ? '#4B5563' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              border: 'none', borderRadius: '12px', color: 'white',
              fontWeight: '700', fontSize: '15px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Creating account...' : 'Activate My Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0A0B14',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
  position: 'relative',
  fontFamily: "'Inter', 'Outfit', sans-serif",
};

const gridBg: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage: `
    linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)
  `,
  backgroundSize: '40px 40px',
  pointerEvents: 'none',
};

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '24px',
  padding: '40px',
  width: '100%',
  maxWidth: '440px',
  position: 'relative',
  backdropFilter: 'blur(20px)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '12px',
  color: 'white',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '13px',
  fontWeight: '600',
  marginBottom: '6px',
  color: '#CBD5E1',
};

const errorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 16px',
  background: 'rgba(239,68,68,0.1)',
  border: '1px solid rgba(239,68,68,0.3)',
  borderRadius: '12px',
  color: '#FCA5A5',
  fontSize: '13px',
  marginBottom: '8px',
};
