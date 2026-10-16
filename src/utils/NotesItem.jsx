import BodyNotes from './BodyNote';
import HeaderNote from './HeaderNote';
import DeleteNote from './DeleteNote';
import { showFormattedDate } from './data';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { MdEdit } from 'react-icons/md';
 
function NotesItem({title, createdAt, body, id, onDelete }) {
 return (
   <div className="note-item">
     <HeaderNote id={id} title={title} createdAt={showFormattedDate(createdAt)}/>
     <BodyNotes body={body}/>
     <div className="note-actions">
       <Link
         className="note-action edit-note"
         to={`/notes/${id}?edit=1`}
         aria-label="Edit catatan"
         title="Edit catatan"
       >
         <MdEdit aria-hidden="true" />
       </Link>
       <DeleteNote id={id} onDelete={onDelete} />
     </div>
   </div>
 );
}

NotesItem.propTypes = {
  title: PropTypes.string.isRequired,
  createdAt: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default NotesItem;
