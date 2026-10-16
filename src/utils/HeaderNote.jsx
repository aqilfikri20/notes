
import PropTypes from 'prop-types';
import {Link} from "react-router-dom"

function HeaderNote({id,title, createdAt}){
    return(
        <div className="note-header">
            <h3 className="note-title" >
                <Link to={ `/notes/${id}`}>{title}</Link>
            </h3>
            <p className="note-date">{createdAt}</p>
        </div>
    );
}

HeaderNote.propTypes = {
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    createdAt: PropTypes.string.isRequired,
};

export default HeaderNote;
