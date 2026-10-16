import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MdAddCircleOutline } from 'react-icons/md';
import ListNotes from './ListNotes';
import { getData, noteDelete } from './data';
import SearchNote from './SearchNote';
import PropTypes from 'prop-types';

function Home({ account, onLogout }) {
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('keyword') || '';

  const refreshNotes = useCallback(async () => {
    try {
      setNotes(await getData());
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshNotes();
  }, [account?.id, refreshNotes]);

  async function handleDelete(id) {
    try {
      await noteDelete(id);
      await refreshNotes();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  function handleSearch(nextKeyword) {
    setSearchParams(nextKeyword ? { keyword: nextKeyword } : {});
  }

  const filteredNotes = notes.filter((note) => note.title.toLowerCase().includes(keyword.toLowerCase()));

  return (
    <section className="dashboard">
      <header className="dashboard-header">
        <Link className="brand" to="/">Ruang Catatan</Link>
        {account ? (
          <div className="account-actions">
            <span>Halo, {account.name}</span>
            <button type="button" className="button button-outline" onClick={onLogout}>Keluar</button>
          </div>
        ) : (
          <nav className="account-actions" aria-label="Akun">
            <Link className="button button-outline" to="/login">Masuk</Link>
            <Link className="button button-primary" to="/register">Daftar</Link>
          </nav>
        )}
      </header>

      <div className="dashboard-hero">
        <p className="eyebrow">Ruang untuk ide Anda</p>
        <h1>Buat Catatan Anda</h1>
        <p>Simpan ide, rencana, dan hal penting dalam satu tempat yang mudah ditemukan.</p>
        {!account && (
          <div className="guest-notice">
            <span>Catatan tanpa akun tersimpan di cache perangkat ini.</span>
            <Link to="/register">Daftar untuk menyimpan salinannya ke database</Link>
          </div>
        )}
      </div>

      <div className="notes-toolbar">
        <div>
          <h2>Catatan Anda</h2>
          <p>{account ? 'Tersimpan di database akun Anda.' : 'Tersimpan di perangkat ini.'}</p>
        </div>
        <SearchNote keyword={keyword} keywordChange={handleSearch} />
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <p className="empty">Memuat catatan...</p> : filteredNotes.length > 0 ? (
        <ListNotes notes={filteredNotes} onDelete={handleDelete} />
      ) : (
        <div className="empty-state">
          <h3>{keyword ? 'Catatan tidak ditemukan' : 'Belum ada catatan'}</h3>
          <p>Mulai dengan menulis catatan pertama Anda.</p>
          <Link className="button button-primary" to="/add">Buat catatan</Link>
        </div>
      )}

      <Link aria-label="Tambah catatan" to="/add" className="add-note-link">
        <MdAddCircleOutline className="add" />
      </Link>
    </section>
  );
}

Home.propTypes = {
  account: PropTypes.shape({ id: PropTypes.number, name: PropTypes.string }),
  onLogout: PropTypes.func.isRequired,
};

export default Home;
