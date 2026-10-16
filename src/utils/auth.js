const ACCOUNT_KEY = 'notes-account-v1';

async function authRequest(path, options = {}) {
  const response = await fetch(`/api/auth/${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'Permintaan akun gagal.');
  }
  return response.status === 204 ? null : response.json();
}

function saveAccount(account) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
}

function getSavedAccount() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null');
  } catch {
    return null;
  }
}

function clearSavedAccount() {
  localStorage.removeItem(ACCOUNT_KEY);
}

async function getCurrentAccount() {
  try {
    const { account } = await authRequest('me');
    saveAccount(account);
    return account;
  } catch (error) {
    clearSavedAccount();
    if (error.message === 'Silakan masuk ke akun Anda.' || error.message === 'Akun tidak ditemukan.') return null;
    throw error;
  }
}

async function getCaptcha() {
  return authRequest('captcha');
}

async function registerAccount(details) {
  const result = await authRequest('register', {
    method: 'POST',
    body: JSON.stringify(details),
  });
  saveAccount(result.account);
  return result;
}

async function loginAccount(details) {
  const result = await authRequest('login', {
    method: 'POST',
    body: JSON.stringify(details),
  });
  saveAccount(result.account);
  return result.account;
}

async function logoutAccount() {
  try {
    await authRequest('logout', { method: 'POST' });
  } finally {
    clearSavedAccount();
  }
}

export {
  authRequest,
  clearSavedAccount,
  getCaptcha,
  getCurrentAccount,
  getSavedAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
  saveAccount,
};
