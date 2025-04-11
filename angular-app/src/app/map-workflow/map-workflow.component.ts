import { Component, AfterViewInit } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-map-workflow',
  standalone: true,
  templateUrl: './map-workflow.component.html',
  styleUrl: './map-workflow.component.css'
})
export class MapWorkflowComponent implements AfterViewInit {
  private map!: mapboxgl.Map;

  ngAfterViewInit(): void {
    this.map = new mapboxgl.Map({
      accessToken: environment.mapboxToken,
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-77.0369, 38.9072],
      zoom: 15
    });

    this.map.addControl(new mapboxgl.NavigationControl());

    const geocoder = new MapboxGeocoder({
      accessToken: environment.mapboxToken,
      mapboxgl: mapboxgl,
      marker: true,
      placeholder: 'Search for a location',
      proximity: { longitude: -77.0369, latitude: 38.9072 },
      countries: 'us',
    });

    console.log('Geocoder initialized:', geocoder);
    this.map.addControl(geocoder);
  }
}
