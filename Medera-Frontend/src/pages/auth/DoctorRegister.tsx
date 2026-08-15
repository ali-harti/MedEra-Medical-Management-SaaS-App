import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Stethoscope, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight, User, Mail, Lock, Phone } from 'lucide-react';
import { authService } from '../../services/notificationService';

const SPECIALTIES = [
  'Médecine Générale', 'Cardiologie', 'Dermatologie', 'Endocrinologie',
  'Gastro-entérologie', 'Gynécologie-Obstétrique', 'Neurologie',
  'Ophtalmologie', 'Orthopédie', 'ORL', 'Pédiatrie', 'Psychiatrie',
  'Radiologie', 'Rhumatologie', 'Urologie', 'Anesthésiologie',
  'Chirurgie Générale', 'Médecine Interne',
];

export default function DoctorRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    specialty: '',
    phone: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    try {
      setLoading(true);
      await authService.doctorRegister({
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        specialty: form.specialty,
        phone: form.phone,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, string[] | string> } };
      const data = e?.response?.data;
      if (data) {
        const first = Object.values(data)[0];
        setError(Array.isArray(first) ? first[0] : String(first));
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 40px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(16,185,129,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
          }}>
            <CheckCircle size={40} color="#10B981" />
          </div>
          <h2 style={{ margin: '0 0 12px', fontSize: '24px', fontWeight: '700' }}>
            Welcome to Medera!
          </h2>
          <p style={{ color: '#94A3B8', margin: '0 0 8px' }}>
            Your account has been created. A welcome email has been sent.
          </p>
          <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Background grid */}
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
          <h1 style={{ margin: '0 0 8px', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            Create Your Cabinet
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>
            Register as a doctor and start managing your practice
          </p>
        </div>

        {error && (
          <div style={errorStyle}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="First Name" icon={<User size={16} />}>
              <input
                style={inputStyle}
                placeholder="Youssef"
                value={form.first_name}
                onChange={update('first_name')}
                required
              />
            </Field>
            <Field label="Last Name" icon={<User size={16} />}>
              <input
                style={inputStyle}
                placeholder="Benali"
                value={form.last_name}
                onChange={update('last_name')}
                required
              />
            </Field>
          </div>

          <Field label="Email" icon={<Mail size={16} />}>
            <input
              type="email"
              style={inputStyle}
              placeholder="doctor@clinic.ma"
              value={form.email}
              onChange={update('email')}
              required
            />
          </Field>

          <Field label="Specialty" icon={<Stethoscope size={16} />}>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.specialty} onChange={update('specialty')}>
              <option value="">Select specialty...</option>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="Phone" icon={<Phone size={16} />}>
            <input
              style={inputStyle}
              placeholder="+212 6XX XXX XXX"
              value={form.phone}
              onChange={update('phone')}
            />
          </Field>

          <Field label="Password" icon={<Lock size={16} />}>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                style={{ ...inputStyle, paddingRight: '44px' }}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={update('password')}
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
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <Field label="Confirm Password" icon={<Lock size={16} />}>
            <input
              type={showPw ? 'text' : 'password'}
              style={inputStyle}
              placeholder="Repeat password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              required
            />
          </Field>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              padding: '14px',
              background: loading ? '#4B5563' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontWeight: '700',
              fontSize: '15px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Creating account...' : <>Create My Cabinet <ArrowRight size={16} /></>}
          </button>
        </form>

        <p style={{ textAlign: 'center', margin: '20px 0 0', fontSize: '13px', color: '#64748B' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#6366F1', fontWeight: '600', textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#CBD5E1' }}>
        <span style={{ color: '#6366F1' }}>{icon}</span>
        {label}
      </label>
      {children}
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
  maxWidth: '480px',
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
