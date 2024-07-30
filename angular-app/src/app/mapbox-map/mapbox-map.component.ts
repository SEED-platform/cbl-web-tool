import { Component, ChangeDetectorRef, OnInit} from '@angular/core';
import { GeoJsonService } from '../services/geojson.service';
import * as mapboxgl from 'mapbox-gl';
import { CommonModule } from '@angular/common'; 
import { environment } from '../../environments/environment';  // Import environment
import { Subscription } from 'rxjs';  // Import Subscription



@Component({
  selector: 'app-mapbox-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mapbox-map.component.html',
  styleUrl: './mapbox-map.component.css'
})


export class MapboxMapComponent implements OnInit {
  map: mapboxgl.Map | undefined;
  style = 'mapbox://styles/mapbox/streets-v11';
  lat: number = 30.2672;
  lng: number = -97.7431;
  buildingArray: any[] =[];
  private geoJsonSubscription: Subscription | undefined;
  private featureClickSubscription: Subscription | undefined;

  constructor(private cdr: ChangeDetectorRef, private geoJsonService: GeoJsonService) {}

  
  ngOnInit() {
    this.geoJsonSubscription = this.geoJsonService.getGeoJson().subscribe(geoJsonObject => {
      this.initializeMapWithGeoJson(geoJsonObject);
    });

    this.featureClickSubscription = this.geoJsonService.selectedFeature$.subscribe(feature => {
      if (feature) {
        this.flyToCoordinates(feature.longitude, feature.latitude);
      }
    });
  }

  ngOnDestroy() {
    if (this.geoJsonSubscription) {
      this.geoJsonSubscription.unsubscribe();
    }
    if (this.featureClickSubscription) {
      this.featureClickSubscription.unsubscribe();
    }
  }

  initializeMapWithGeoJson(geoJsonObject: any) {
    if (!geoJsonObject || !geoJsonObject.features || geoJsonObject.features.length === 0) {
      console.error("Invalid GeoJSON data or no features found");
      return;
    }

     

    
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

      this.map.on('click', 'features', (e) => {
        if (e.features && e.features.length > 0) {
       
            const longitude =  e.features[0].properties.longitude;
            const latitude = e.features[0].properties.latitude;
            if (this.map) {
                // Fly to the clicked feature's coordinates
                this.map.flyTo({
                    center: new mapboxgl.LngLat(longitude,latitude),
                    zoom: 17.5 // Optionally adjust zoom level when flying to the feature
                });
                this.geoJsonService.emitClickEvent(latitude, longitude);
            }
        }
    });
      });   
  }
  

  flyToCoordinates(clickedBuildingLong: number, clickedBuildingLat: number) {
     console.log(clickedBuildingLat);
    if (this.map) {
       this.map.flyTo({
        center:  new mapboxgl.LngLat(clickedBuildingLong, clickedBuildingLat),
        zoom:17.5,
        essential: true 
       });
    }
  }

}