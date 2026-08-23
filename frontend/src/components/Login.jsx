import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from './Toast';
import {
  IconLogo,
  IconCode,
  IconBuilding,
  IconUser,
  IconLock,
  IconBriefcase
} from './Icons';

const IconGoogle = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

const Login = ({ setUser }) => {
  const navigate = useNavigate();
  const toast = useToast();

  // Tab state
  const [tab, setTab] = useState('login'); // 'login' | 'register'

  // Login fields
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Register fields
  const [regForm, setRegForm] = useState({
    username: '', email: '', password: '', confirmPassword: '', role: 'freelancer',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  /* ── Listen for OAuth 2.0 Redirects ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('oauthToken') || params.get('token');
    const error = params.get('error');

    if (error) {
      toast.error(decodeURIComponent(error));
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (oauthToken) {
      const userObj = {
        token: oauthToken,
        id: params.get('id') ? Number(params.get('id')) : null,
        username: decodeURIComponent(params.get('username') || 'User'),
        email: decodeURIComponent(params.get('email') || ''),
        role: params.get('role') || 'ROLE_FREELANCER',
        balance: params.get('balance') ? Number(params.get('balance')) : 0,
      };

      localStorage.setItem('token', oauthToken);
      localStorage.setItem('user', JSON.stringify(userObj));
      if (setUser) setUser(userObj);
      toast.success(`Welcome, ${userObj.username}! Signed in with Google.`);
      window.history.replaceState({}, document.title, window.location.pathname);
      navigate('/dashboard');
    }
  }, [navigate, setUser, toast]);

  /* ---- GOOGLE OAUTH ---- */
  const handleGoogleAuth = () => {
    window.location.href = 'http://localhost:8080/oauth2/authorization/google';
  };

  /* ---- LOGIN ---- */
  const handleLogin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!loginForm.username) errs.username = 'Username is required';
    if (!loginForm.password) errs.password = 'Password is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    setLoading(true);
    try {
      const res = await api.post('/auth/signin', {
        username: loginForm.username,
        password: loginForm.password,
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data));
      setUser(res.data);
      toast.success(`Welcome back, ${res.data.username}!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ---- REGISTER ---- */
  const handleRegister = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!regForm.username)    errs.username = 'Username is required';
    if (!regForm.email)       errs.email    = 'Email is required';
    if (!regForm.password)    errs.password = 'Password is required';
    if (regForm.password !== regForm.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    setLoading(true);
    try {
      await api.post('/auth/signup', {
        username: regForm.username,
        email:    regForm.email,
        password: regForm.password,
        role:     regForm.role,
      });
      toast.success('Account created! Please log in.');
      setTab('login');
      setLoginForm({ username: regForm.username, password: '' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Try a different username/email.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* ── Hero Panel ── */}
      <div className="auth-hero">
        <div className="auth-hero-content">
          <div className="auth-hero-logo" style={{ color: 'var(--clr-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconLogo size={44} />
          </div>
          <h1>MicroGig</h1>
          <p>
            The modern micro-freelancing marketplace. Connect top talent with exciting
            projects — fast, secure, and transparent.
          </p>

          <div className="auth-stats">
            <div className="auth-stat">
              <div className="value">1K+</div>
              <div className="label">Freelancers</div>
            </div>
            <div className="auth-stat">
              <div className="value">500+</div>
              <div className="label">Projects</div>
            </div>
            <div className="auth-stat">
              <div className="value">$50K+</div>
              <div className="label">Paid Out</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form Panel ── */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">

          {/* Tab Switcher */}
          <div className="tab-switcher" role="tablist">
            <button
              id="tab-login"
              className={`tab-btn ${tab === 'login' ? 'active' : ''}`}
              onClick={() => { setTab('login'); setErrors({}); }}
            >
              Sign In
            </button>
            <button
              id="tab-register"
              className={`tab-btn ${tab === 'register' ? 'active' : ''}`}
              onClick={() => { setTab('register'); setErrors({}); }}
            >
              Create Account
            </button>
          </div>

          {/* ── GOOGLE OAUTH 2.0 BUTTON ── */}
          <div style={{ marginBottom: '1.25rem' }}>
            <button
              id="btn-google-login"
              type="button"
              className="btn btn-outline btn-full"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.65rem',
                backgroundColor: 'var(--clr-surface)',
                borderColor: 'var(--clr-border)',
                color: 'var(--clr-text)',
                fontWeight: 500,
                padding: '0.75rem 1rem',
                borderRadius: 'var(--r-md)',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all var(--t-fast)'
              }}
              onClick={handleGoogleAuth}
            >
              <IconGoogle size={19} />
              <span>Continue with Google</span>
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '1.25rem 0',
                color: 'var(--clr-text-3)',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--clr-border)' }} />
              <span style={{ padding: '0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or continue with</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--clr-border)' }} />
            </div>
          </div>

          {/* ── LOGIN FORM ── */}
          {tab === 'login' && (
            <div style={{ animation: 'fadeSlideUp 0.2s ease' }}>
              <h2>Welcome back</h2>
              <p className="subtitle">Sign in to your MicroGig account</p>

              <form onSubmit={handleLogin} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="login-username">Username</label>
                  <input
                    id="login-username"
                    className={`form-input ${errors.username ? 'error' : ''}`}
                    type="text"
                    placeholder="your_username"
                    value={loginForm.username}
                    onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                  />
                  {errors.username && <span className="form-error">{errors.username}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                  />
                  {errors.password && <span className="form-error">{errors.password}</span>}
                </div>

                <button
                  id="btn-login-submit"
                  type="submit"
                  className="btn btn-primary btn-full btn-lg"
                  disabled={loading}
                  style={{ marginTop: '0.5rem' }}
                >
                  {loading ? <><span className="spinner" /> Signing in…</> : 'Sign In'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--clr-text-3)', fontSize: '0.85rem' }}>
                No account?{' '}
                <span
                  style={{ color: 'var(--clr-primary)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => { setTab('register'); setErrors({}); }}
                >
                  Create one free
                </span>
              </p>
            </div>
          )}

          {/* ── REGISTER FORM ── */}
          {tab === 'register' && (
            <div style={{ animation: 'fadeSlideUp 0.2s ease' }}>
              <h2>Join MicroGig</h2>
              <p className="subtitle">Create your free account today</p>

              <form onSubmit={handleRegister} noValidate>
                {/* Role Selector */}
                <div className="form-group">
                  <label className="form-label">I want to…</label>
                  <div className="role-selector">
                    <div
                      id="role-freelancer"
                      className={`role-option ${regForm.role === 'freelancer' ? 'selected' : ''}`}
                      onClick={() => setRegForm(f => ({ ...f, role: 'freelancer' }))}
                    >
                      <div className="role-icon" style={{ color: 'var(--clr-accent)' }}>
                        <IconCode size={26} />
                      </div>
                      <div className="role-name">Freelancer</div>
                      <div className="role-desc">Find work & get paid</div>
                    </div>
                    <div
                      id="role-client"
                      className={`role-option ${regForm.role === 'client' ? 'selected' : ''}`}
                      onClick={() => setRegForm(f => ({ ...f, role: 'client' }))}
                    >
                      <div className="role-icon" style={{ color: 'var(--clr-primary)' }}>
                        <IconBuilding size={26} />
                      </div>
                      <div className="role-name">Client</div>
                      <div className="role-desc">Post jobs & hire talent</div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-username">Username</label>
                  <input
                    id="reg-username"
                    className={`form-input ${errors.username ? 'error' : ''}`}
                    type="text"
                    placeholder="choose_a_username"
                    value={regForm.username}
                    onChange={e => setRegForm(f => ({ ...f, username: e.target.value }))}
                  />
                  {errors.username && <span className="form-error">{errors.username}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-email">Email</label>
                  <input
                    id="reg-email"
                    className={`form-input ${errors.email ? 'error' : ''}`}
                    type="email"
                    placeholder="you@example.com"
                    value={regForm.email}
                    onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                  />
                  {errors.email && <span className="form-error">{errors.email}</span>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-password">Password</label>
                    <input
                      id="reg-password"
                      className={`form-input ${errors.password ? 'error' : ''}`}
                      type="password"
                      placeholder="••••••••"
                      value={regForm.password}
                      onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
                    />
                    {errors.password && <span className="form-error">{errors.password}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-confirm">Confirm</label>
                    <input
                      id="reg-confirm"
                      className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                      type="password"
                      placeholder="••••••••"
                      value={regForm.confirmPassword}
                      onChange={e => setRegForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    />
                    {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
                  </div>
                </div>

                <button
                  id="btn-register-submit"
                  type="submit"
                  className="btn btn-primary btn-full btn-lg"
                  disabled={loading}
                  style={{ marginTop: '0.5rem' }}
                >
                  {loading ? <><span className="spinner" /> Creating account…</> : 'Create Account'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--clr-text-3)', fontSize: '0.85rem' }}>
                Already have an account?{' '}
                <span
                  style={{ color: 'var(--clr-primary)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => { setTab('login'); setErrors({}); }}
                >
                  Sign in
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
