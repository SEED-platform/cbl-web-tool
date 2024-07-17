import { Component, AfterViewInit} from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { environment } from '../../environments/environment';  // Import environment


@Component({
  selector: 'app-mapbox-map',
  standalone: true,
  imports: [],
  templateUrl: './mapbox-map.component.html',
  styleUrl: './mapbox-map.component.css'
})


export class MapboxMapComponent implements AfterViewInit {
  map: mapboxgl.Map | undefined;
  style = 'mapbox://styles/mapbox/streets-v11';
  lat: number = 30.2672;
  lng: number = -97.7431;


  
  ngAfterViewInit() {
    this.initializeMap();
  }

  initializeMap() {
    this.map = new mapboxgl.Map({
      accessToken: environment.mapboxToken,
      container: 'map', // Ensure this ID matches the container in your HTML
      style: this.style,
      zoom: 13,
      center: [this.lng, this.lat]
    });

    this.map.on('load', () => {
      this.addGeoJson();
    });
  }

  addGeoJson() {
    //if map not initialized exit function
    if (!this.map) return;
    
    const localGeoJsonData = sessionStorage.getItem('GEOJSONDATA');
  
     
    if (localGeoJsonData){
    const geoJsonObject = JSON.parse(localGeoJsonData);
    this.map.addSource('features', {
      type: 'geojson',
      data: geoJsonObject
    });

    this.map.addLayer({
      id: 'features',
      type: 'fill',
      source: 'features',
      paint: {
        'fill-color': '#088',
        'fill-opacity': 0.8
      }
    });
     
    console.log(localGeoJsonData);
    const firstBuildingLongitude = geoJsonObject.features[0].properties.longitude;
    const firstBuildingLatitude = geoJsonObject.features[0].properties.latitude;
    const center = new mapboxgl.LngLat(firstBuildingLongitude , firstBuildingLatitude);
    this.map.setCenter(center);
    }

   
  }
}