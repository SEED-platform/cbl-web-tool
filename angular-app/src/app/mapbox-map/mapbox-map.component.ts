import { Component, AfterViewInit, ChangeDetectorRef} from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { CommonModule } from '@angular/common'; 
import { environment } from '../../environments/environment';  // Import environment


@Component({
  selector: 'app-mapbox-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mapbox-map.component.html',
  styleUrl: './mapbox-map.component.css'
})


export class MapboxMapComponent implements AfterViewInit {
  map: mapboxgl.Map | undefined;
  style = 'mapbox://styles/mapbox/streets-v11';
  lat: number = 30.2672;
  lng: number = -97.7431;
  buildingArray: any[] =[];

  constructor(private cdr: ChangeDetectorRef) {}

  
  ngAfterViewInit() {
    this.initializeMapWithGeoJson();
  }



  initializeMapWithGeoJson() {
    const localGeoJsonData = sessionStorage.getItem('GEOJSONDATA');

     
    if (localGeoJsonData){
      
      const geoJsonObject = JSON.parse(localGeoJsonData);
      this.buildingArray = geoJsonObject.features;
      this.cdr.detectChanges();
      const firstBuildingLongitude = this.buildingArray[0].properties.longitude;
      const firstBuildingLatitude = this.buildingArray[0].properties.latitude;
      const firstBuildingCoordinates = new mapboxgl.LngLat(firstBuildingLongitude, firstBuildingLatitude);
     
      this.map = new mapboxgl.Map({
        accessToken: environment.mapboxToken,
        container: 'map', // map is id of div in html
        style: this.style,
        attributionControl: false,
        zoom: 15,
        center: firstBuildingCoordinates
      });
  
     
      this.map.on('load', () => {

      if (!this.map) return; //if map not intialized exit load

      this.map.addSource('features', {
        type: 'geojson',
        data: geoJsonObject
      });
  
      this.map.addLayer({
        id: 'features',
        type: 'fill',
        source: 'features',
        paint: {
          'fill-color': '#0B5E90',
          'fill-opacity': 0.8
        }
      });

      });
      
    }     
  }


  flyToCoordinates( clickedBuildingLong: number, clickedBuildingLat: number,) {
    if (this.map) {
       this.map.flyTo({
        center:  new mapboxgl.LngLat(clickedBuildingLong, clickedBuildingLat),
        zoom:15,
        essential: true 
       });
    }
  }
}