import React, { Component } from 'react';
import { Button } from 'reactstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPowerOff } from '@fortawesome/free-solid-svg-icons'

import './HButton.css';

export class HButtonCore extends Component {
    
    static defaultProps = {
        name: "开关",
        ClassName: "HButton",
        size: [3, 3, 3, 3]
    }

    onCheckClick = (e) => {
        if(this.props.onClick)
        {
            this.props.onClick(e);
        }
    }

    render() {
        return (      
            <Button outline active={this.props.active} size='lg' className="myToggleButton" onClick={e => this.onCheckClick(e)}>
                <FontAwesomeIcon icon={faPowerOff}/>
            </Button> 
        );
    }
}