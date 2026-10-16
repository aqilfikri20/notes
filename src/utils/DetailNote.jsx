import React from 'react';
import { getNotes, updateNote } from './data';
import OpenNotes from './OpenNotes';
import { Link, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';

function DetailPageWrapper(){
  const { id } = useParams();
  return <DetailNote id={Number(id)} />;
}

class DetailNote extends React.Component {
  constructor(props) {
    super(props);
    this.state = { notes: null, loading: true, error: '' };
    this.onSave = this.onSave.bind(this);
  }

  async componentDidMount() {
    try {
      this.setState({ notes: await getNotes(this.props.id), loading: false });
    } catch (error) {
      this.setState({ loading: false, error: error.message });
    }
  }

  async onSave(updatedNotes) {
    try {
      const notes = await updateNote(this.props.id, updatedNotes);
      this.setState({ notes, error: '' });
    } catch (error) {
      this.setState({ error: error.message });
      throw error;
    }
  }

  render() {
    return (
      <section className="detail-screen">
        <header className="detail-topbar">
          <Link className="detail-back" to="/">← <span>Kembali ke catatan</span></Link>
          <span className="detail-brand">RUANG CATATAN</span>
        </header>
        <div className="detail-content">
          {this.state.loading ? (
            <p className="detail-message">Memuat catatan...</p>
          ) : !this.state.notes ? (
            <p className="detail-message" role="alert">{this.state.error || 'Catatan tidak ditemukan.'}</p>
          ) : (
            <>
              <p className="detail-eyebrow">CATATAN PRIBADI</p>
              {this.state.error && <p className="form-error" role="alert">{this.state.error}</p>}
              <OpenNotes {...this.state.notes} onSave={this.onSave} />
            </>
          )}
        </div>
      </section>
    );
  }
}

DetailNote.propTypes = {
  id: PropTypes.number.isRequired,
};

export default DetailPageWrapper;
