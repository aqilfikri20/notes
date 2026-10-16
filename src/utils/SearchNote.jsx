import PropTypes from 'prop-types'

function SearchNote({keyword, keywordChange}) {
    return(
        <input className="searchNote"
        type="text"
        placeholder="Cari Catatan"
        value={keyword}
        onChange={(event) => keywordChange(event.target.value)}/>
    )
}

SearchNote.propTypes ={
    keyword: PropTypes.string.isRequired,
    keywordChange: PropTypes.func.isRequired,
};

export default SearchNote;
