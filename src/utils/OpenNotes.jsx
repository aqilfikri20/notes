import { useState } from 'react';
import PropTypes from 'prop-types';
import { useSearchParams } from 'react-router-dom';
import { showFormattedDate } from './data';
import { MdCheck, MdClose, MdEdit } from 'react-icons/md';

function OpenNotes({ title, createdAt, body, onSave }) {
  const [searchParams] = useSearchParams();
  const [editing, setEditing] = useState(searchParams.get('edit') === '1');
  const [draft, setDraft] = useState({ title, body });
  const [error, setError] = useState('');

  async function submitEdit(event) {
    event.preventDefault();
    try {
      await onSave(draft);
      setEditing(false);
      setError('');
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  return (
    <article className={`note-detail${editing ? ' is-editing' : ''}`}>
      {editing ? (
        <form className="detail-edit-form" onSubmit={submitEdit}>
          <label htmlFor="edit-note-title">Judul</label>
          <input
            id="edit-note-title"
            className="add-title"
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            maxLength={255}
            required
          />
          <label htmlFor="edit-note-body">Isi catatan</label>
          <textarea
            id="edit-note-body"
            className="add-body"
            value={draft.body}
            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
            required
          />
          {error && <p role="alert">{error}</p>}
          <div className="detail-edit-actions">
            <button className="detail-save" type="submit"><MdCheck aria-hidden="true" /> Simpan perubahan</button>
            <button className="detail-cancel" type="button" onClick={() => setEditing(false)}><MdClose aria-hidden="true" /> Batal</button>
          </div>
        </form>
      ) : (
        <>
          <div className="detail-card-heading">
            <div>
              <p className="detail-card-label">JUDUL</p>
              <h1 className="note-title">{title}</h1>
            </div>
            <button
              className="detail-edit-button"
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit catatan"
              title="Edit catatan"
            >
              <MdEdit aria-hidden="true" />
            </button>
          </div>
          <p className="note-date">Dibuat {showFormattedDate(createdAt)}</p>
          <div className="detail-divider" />
          <p className="note-body">{body}</p>
        </>
      )}
    </article>
  );
}

OpenNotes.propTypes = {
  id: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  createdAt: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default OpenNotes;
