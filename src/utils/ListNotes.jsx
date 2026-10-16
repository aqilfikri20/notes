import NotesItem from './NotesItem';
import PropTypes from 'prop-types';
 
function ListNotes({ notes, onDelete }) {
 return (
   <div className="notes-list">
     
     {
       notes.map((notes) => (
        <NotesItem 
        key={notes.id}
        id={notes.id}
        onDelete={onDelete}
        {...notes} />
      ))
    }
  </div>
);
}

ListNotes.propTypes = {
  notes: PropTypes.array.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default ListNotes;
