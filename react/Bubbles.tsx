import React, { Component } from 'react'
import { Helmet } from 'render'

import './js/daynightoverlay.js'
import { IMAGE_ROOT, start } from './js/main.js'

import './global.css'

export default class Bubbles extends Component {
  public componentDidMount() {
    start()
  }

  public render() {
    return (
      <div>
        <Helmet>
          <title>VTEX Order Map</title>
          <link rel="shortcut icon" href="https://io.vtex.com.br/favico/1.3.0/favico.ico"></link>
        </Helmet>
        <div className="container" id="container">
          <canvas id="map"></canvas>
          <canvas id="heatmap"></canvas>
          <canvas id="overlay"></canvas>
          <canvas id="image-gallery"></canvas>
          <a href="https://en.vtex.com/" rel="noopener noreferrer" target="_blank">
            <img src={`${IMAGE_ROOT}/vtex-logo.svg`} className="logovtex" alt="Logo VTEX"/>
          </a>
        </div>
      </div>
    )
  }
}
