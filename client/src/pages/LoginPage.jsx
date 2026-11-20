import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Banknote, ScrollText } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { makeMoney } from '../utils/currency';
import { guessRegion } from '../utils/region';

const REGION_STORAGE_KEY = 'pharmaguard.region';

export default function LoginPage() {
  const { options, login, register, bootError } = useAuth();
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState(() => {
    const saved = (() => { try { return localStorage.getItem(REGION_STORAGE_KEY); } catch { return null; } })();
    const initialRegion = options.regions.some((r) => r.code === saved)
      ? saved
      : guessRegion(options.regions, options.defaultRegion);
    return {
      username: '',
      password: '',
      role: options.roles[0] ?? 'Inventory Manager',
      region: initialRegion,
    };
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Sync region once options load from /api/meta/options
  useEffect(() => {
    if (!options.regions.length) return;
    setForm((f) => {
      if (options.regions.some((r) => r.code === f.region)) return f;
      const saved = (() => { try { return localStorage.getItem(REGION_STORAGE_KEY); } catch { return null; } })();
      const next = options.regions.some((r) => r.code === saved)
        ? saved
        : guessRegion(options.regions, options.defaultRegion);
      return { ...f, region: next };
    });
  }, [options.regions, options.defaultRegion]);

  const set = (key) => (e) => {
    const value = e.target.value;
    if (key === 'region') {
      try { localStorage.setItem(REGION_STORAGE_KEY, value); } catch { /* storage unavailable */ }
    }
    setForm((f) => ({ ...f, [key]: value }));
  };

  const regionMoney = useMemo(() => {
    const r = options.regions.find((x) => x.code === form.region);
    return r ? makeMoney(r) : null;
  }, [options.regions, form.region]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signin') await login(form.username, form.password, form.region);
      else await register(form);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const isRegister = mode === 'register';

  return (
    <div className="auth">
      <section className="auth-art" aria-hidden="true">
        <div className="auth-brand"><Logo size={40} /><span>PharmaGuard</span></div>
        <div className="auth-copy">
          <h1>Catch every expiry before it becomes a write-off.</h1>
          <ul>
            <li><ShieldCheck size={20} /><span>Each batch is rated expired, critical, warning or optimal against today’s date.</span></li>
            <li><Banknote size={20} /><span>Losses and stock value are shown in your own currency and number format.</span></li>
            <li><ScrollText size={20} /><span>Every change is written to an append-only audit trail.</span></li>
          </ul>
        </div>
        <svg className="auth-capsules" viewBox="0 0 400 400" focusable="false">
          <g transform="rotate(-35 200 200)">
            <rect x="40" y="170" width="320" height="120" rx="60" fill="#0e4a41" />
            <path d="M200 170h100a60 60 0 0 1 0 120H200z" fill="#4fc9ad" opacity=".9" />
          </g>
          <g transform="rotate(25 120 90)">
            <rect x="20" y="60" width="200" height="64" rx="32" fill="#0c3a33" />
            <path d="M120 60h68a32 32 0 0 1 0 64h-68z" fill="#0b6b5c" />
          </g>
        </svg>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit} noValidate={false}>
          <div className="auth-card-brand"><Logo size={30} className="logo-on-light" /><span>PharmaGuard</span></div>
          <h2>{isRegister ? 'Create your account' : 'Sign in'}</h2>
          <p className="auth-sub">{isRegister ? 'Your stock, losses and audit trail stay private to your account.' : 'Welcome back. Pick up where your inventory left off.'}</p>

          {bootError && <p className="form-error" role="alert">{bootError}</p>}

          <div className="field">
            <label htmlFor="au-user">Username</label>
            <input id="au-user" value={form.username} onChange={set('username')} autoComplete="username" required minLength={3} maxLength={40} autoFocus />
          </div>

          <div className="field">
            <label htmlFor="au-pass">Password</label>
            <div className="input-affix input-affix-end">
              <input id="au-pass" type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')}
                autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 8 : 1} />
              <button type="button" className="icon-btn" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {isRegister && <small>At least 8 characters.</small>}
          </div>

          <div className="field">
            <label htmlFor="au-region">Region &amp; Currency</label>
            <select id="au-region" value={form.region} onChange={set('region')}>
              {options.regions.map((r) => (
                <option key={r.code} value={r.code}>{r.name} · {r.currency}</option>
              ))}
            </select>
            {regionMoney && (
              <small>
                Currency: <strong>{regionMoney.currency} ({regionMoney.symbol})</strong> — preview: {regionMoney.format(1234567.5)}
              </small>
            )}
          </div>

          {isRegister && (
            <div className="field">
              <label htmlFor="au-role">Your role</label>
              <select id="au-role" value={form.role} onChange={set('role')}>
                {options.roles.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>

          <p className="auth-switch">
            {isRegister ? 'Already have an account?' : 'New to PharmaGuard?'}{' '}
            <button type="button" className="link-btn" onClick={() => { setMode(isRegister ? 'signin' : 'register'); setError(''); }}>
              {isRegister ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}