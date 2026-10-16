import PropTypes from 'prop-types';
import { MdDeleteOutline } from 'react-icons/md';

function DeleteNote({ id, onDelete }) {
    return (
      <button
        type="button"
        className="note-action delete-note"
        onClick={() => onDelete(id)}
        aria-label="Hapus catatan"
        title="Hapus catatan"
      >
        <MdDeleteOutline aria-hidden="true" />
      </button>
    );
  }

  DeleteNote.propTypes ={
    id: PropTypes.number.isRequired,
    onDelete : PropTypes.func.isRequired,
  };
   
  export default DeleteNote;
