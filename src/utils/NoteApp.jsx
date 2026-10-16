import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import AddPage from './AddPage';
import Home from './Home';
import DetailPageWrapper from './DetailNote';
import { getCurrentAccount, logoutAccount } from './auth';
import { LoginPage, RegisterPage } from './AccountPages';

function NoteApp() {
  const [account, setAccount] = useState(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    getCurrentAccount()
      .catch((error) => setAuthError(error.message))
      .finally(() => setReady(true));
  }, []);

  async function handleLogout() {
    try {
      await logoutAccount();
    } finally {
      setAccount(null);
    }
  }

  return (
    <div className="notes-app">
      <main>
        {!ready ? <p className="empty">Memuat dashboard...</p> : (
          <>
            {authError && <p className="form-error" role="alert">{authError}</p>}
            <Routes>
              <Route path="/" element={<Home account={account} onLogout={handleLogout} />} />
              <Route path="/register" element={<RegisterPage onAuth={setAccount} />} />
              <Route path="/login" element={<LoginPage onAuth={setAccount} />} />
              <Route path="/add" element={<AddPage />} />
              <Route path="/notes/:id" element={<DetailPageWrapper />} />
            </Routes>
          </>
        )}
      </main>
    </div>
  );
}
   
export default NoteApp;
