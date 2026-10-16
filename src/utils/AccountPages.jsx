import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { getCaptcha, loginAccount, registerAccount } from './auth';
import { getGuestNotes } from './data';

function AccountLayout({ title, description, children }) {
  return (
    <main className="account-page">
      <Link to="/" className="account-back">← Kembali ke dashboard</Link>
      <section className="account-card">
        <p className="eyebrow">Ruang Catatan</p>
        <h1>{title}</h1>
        <p className="account-description">{description}</p>
        {children}
      </section>
    </main>
  );
}

AccountLayout.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

function RegisterPage({ onAuth }) {
  const navigate = useNavigate();
  const [captcha, setCaptcha] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', captchaAnswer: '' });

  const refreshCaptcha = useCallback(async () => {
    try {
      setCaptcha(await getCaptcha());
      setForm((previous) => ({ ...previous, captchaAnswer: '' }));
    } catch (captchaError) {
      setError(captchaError.message);
    }
  }, []);

  useEffect(() => { refreshCaptcha(); }, [refreshCaptcha]);

  function updateField(event) {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!captcha) return;
    setLoading(true);
    setError('');
    try {
      const result = await registerAccount({ ...form, captchaId: captcha.id, notes: getGuestNotes() });
      onAuth(result.account);
      navigate('/');
    } catch (registerError) {
      setError(registerError.message);
      await refreshCaptcha();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AccountLayout title="Buat akun Anda" description="Daftar untuk menyimpan catatan di database. Catatan perangkat Anda akan ikut disalin.">
      <form className="account-form" onSubmit={submit}>
        <label>Nama
          <input name="name" value={form.name} onChange={updateField} autoComplete="name" maxLength={100} required />
        </label>
        <label>Email
          <input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required />
        </label>
        <label>Password
          <input name="password" type="password" value={form.password} onChange={updateField} autoComplete="new-password" minLength={8} required />
        </label>
        <label>Konfirmasi password
          <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={updateField} autoComplete="new-password" minLength={8} required />
        </label>
        <label>Captcha
          <span className="captcha-question">{captcha?.question || 'Memuat captcha...'}</span>
          <input name="captchaAnswer" inputMode="numeric" value={form.captchaAnswer} onChange={updateField} required aria-label="Jawaban captcha" />
        </label>
        <button type="button" className="captcha-refresh" onClick={refreshCaptcha}>Muat captcha baru</button>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary button-wide" type="submit" disabled={loading || !captcha}>
          {loading ? 'Membuat akun...' : 'Daftar dan simpan catatan'}
        </button>
      </form>
      <p className="account-switch">Sudah punya akun? <Link to="/login">Masuk</Link></p>
    </AccountLayout>
  );
}

RegisterPage.propTypes = { onAuth: PropTypes.func.isRequired };

function LoginPage({ onAuth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(event) {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const account = await loginAccount(form);
      onAuth(account);
      navigate('/');
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AccountLayout title="Masuk ke akun" description="Masuk untuk membuka catatan yang tersimpan di akun Anda.">
      <form className="account-form" onSubmit={submit}>
        <label>Email
          <input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required />
        </label>
        <label>Password
          <input name="password" type="password" value={form.password} onChange={updateField} autoComplete="current-password" required />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary button-wide" type="submit" disabled={loading}>
          {loading ? 'Memeriksa...' : 'Masuk'}
        </button>
      </form>
      <p className="account-switch">Belum punya akun? <Link to="/register">Daftar</Link></p>
    </AccountLayout>
  );
}

LoginPage.propTypes = { onAuth: PropTypes.func.isRequired };

export { LoginPage, RegisterPage };
