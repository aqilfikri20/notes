import PropTypes from 'prop-types';
 
function BodyNotes({body}) {
 return (
   <div className="note-body">
     <p>{body}</p>
   </div>
 );
}

BodyNotes.propTypes = {
  body: PropTypes.string.isRequired,
}
 
export default BodyNotes;
