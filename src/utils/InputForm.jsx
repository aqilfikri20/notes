import React from 'react';
import PropTypes from 'prop-types';

import { MdOutlineCheckCircle } from "react-icons/md";

class InputForm extends React.Component{
    constructor(props){
        super(props);
            this.state = {
                title:'',
                body:'',

        }

        this.onTitleEvent = this.onTitleEvent.bind(this);
        this.onBodyEvent = this.onBodyEvent.bind(this);
        this.onSubmitEvent = this.onSubmitEvent.bind(this);
    }

    onTitleEvent(event){
        this.setState(() => {
            return{
                title: event.target.value,
            }
        });
    }

    onBodyEvent(event){
        this.setState({ body: event.target.value });
    }

    onSubmitEvent(event){
        event.preventDefault();
        this.props.addNotes(this.state);
    }

    render(){
        return(
        <form className = 'note-input' onSubmit={this.onSubmitEvent}>
        <input
          type='text'
          className='add-title'
          placeholder='Tulis Judul...'
          required
          value={this.state.title}
          onChange={this.onTitleEvent}
        />
       
        <textarea
    className="add-body"
    placeholder="Tulis isi catatan..."
    value={this.state.body}
    onChange={this.onBodyEvent}
    required
    />
      <button type='submit' className='done'><MdOutlineCheckCircle className='mdDone'/></button>
     </form>
     
        )
    }
}

InputForm.propTypes={
    addNotes: PropTypes.func.isRequired
};

export default InputForm;
