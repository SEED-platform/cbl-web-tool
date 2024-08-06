import { Component, ChangeDetectorRef, OnInit, OnDestroy,ViewEncapsulation } from '@angular/core';
import { GeoJsonService } from '../services/geojson.service';
import { FlaskRequests } from '../services/server.service';
import * as mapboxgl from 'mapbox-gl';
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { CommonModule, JsonPipe } from '@angular/common';
import { environment } from '../../environments/environment';
import { Subscription } from 'rxjs';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';


@Component({
  selector: 'app-mapbox-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mapbox-map.component.html',
  styleUrls: ['./mapbox-map.component.css']
})
export class MapboxMapComponent implements OnInit, OnDestroy {
  map: mapboxgl.Map | undefined;
  style = 'mapbox://styles/mapbox/streets-v12';
  satelliteStyle = 'mapbox://styles/mapbox/satellite-v12';
  lat: number = 30.2672;
  lng: number = -97.7431;
  buildingArray: any[] = [];
  private zoomLevel: number = 15;
  private isFirstLoad: boolean = true;
  private geoJsonSubscription: Subscription | undefined;
  private featureClickSubscription: Subscription | undefined;
  private mapCoordinatesSubscription: Subscription | undefined;
  private geoJsonPropertyNames: any;
  private newGeoJson: any;
  private satelliteView: boolean = false; 
  constructor(private cdr: ChangeDetectorRef, private geoJsonService: GeoJsonService, private apiHandler: FlaskRequests) {}

  ngOnInit() {
    this.geoJsonSubscription = this.geoJsonService.getGeoJson().subscribe(geoJsonObject => {
      this.initializeMapWithGeoJson(geoJsonObject);
      this.geoJsonPropertyNames = JSON.parse(sessionStorage.getItem("GEOJSONPROPERTYNAMES") || "[]");
    });

    this.featureClickSubscription = this.geoJsonService.selectedFeature$.subscribe(feature => {
      if (feature) {
        this.flyToCoordinates(feature.longitude, feature.latitude);
      }
    });

    this.mapCoordinatesSubscription = this.geoJsonService.mapCoordinates$.subscribe(feature => {
      if (feature) {
        this.updateZoomLevelForDeletion();
        this.setMapCenterAndZoom(feature.longitude, feature.latitude); // Update map view based on new coordinates
      }
    });
  }

  ngOnDestroy() {
    this.geoJsonSubscription?.unsubscribe();
    this.featureClickSubscription?.unsubscribe();
    this.mapCoordinatesSubscription?.unsubscribe();
  }

  initializeMapWithGeoJson(geoJsonObject: any) {
   
    if(!this.map){
    let emptyLat: number = 0;
    let emptyLong: number = 0;

     if (geoJsonObject.features.length === 0) {
        console.log("no features found");

        const coords = this.geoJsonService.getCurrentCoordinates();
       
        if (coords) {
          emptyLong= coords.longitude;
          emptyLat = coords.latitude;
        }else {
         emptyLat = 39.8283;
         emptyLong =  -98.5795;  
        }

       this.map = new mapboxgl.Map({
        accessToken: environment.mapboxToken,
        container: 'map', // map is id of div in html
        style: this.style,
        attributionControl: false,
        zoom: this.zoomLevel,
        center: [emptyLong, emptyLat] // [longitude, latitude]
       });  

    }else{
    // if map has polygons
      this.buildingArray = geoJsonObject.features;
      this.cdr.detectChanges();

      let firstBuildingLatitude:number;
      let firstBuildingLongitude:number;

    
      if (this.isFirstLoad){
          const firstBuilding = this.buildingArray[0];
          firstBuildingLongitude = firstBuilding.properties.longitude;
          firstBuildingLatitude = firstBuilding.properties.latitude;
          this.geoJsonService.setMapCoordinates(firstBuildingLatitude, firstBuildingLongitude);
          this.isFirstLoad = false;
      }else{
          const coords = this.geoJsonService.getCurrentCoordinates();
          if (coords) {
              firstBuildingLongitude = coords.longitude;
              firstBuildingLatitude = coords.latitude;
          }else{
              firstBuildingLongitude = -98.5795; // Default longitude
              firstBuildingLatitude = 39.8283;  // Default latitude
          }
      }

      this.map = new mapboxgl.Map({
      accessToken: environment.mapboxToken,
      container: 'map', // map is id of div in html
      style: this.style,
      attributionControl: false,
      zoom: this.zoomLevel,
      center: [firstBuildingLongitude, firstBuildingLatitude] // [longitude, latitude]
    });
  }

    this.map.on('load', () => {
    
      if (this.map) {
        const source = this.map.getSource('features');
      
      if (source) {
        (source as mapboxgl.GeoJSONSource).setData(geoJsonObject);
      } else {
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
            'fill-opacity': 0.6
          }
        });
        this.addDrawFeatures(this.map, geoJsonObject);
      }
    }    
    });

  }else{
    this.updateSource(geoJsonObject);
  }

  
  this.map.on('click', 'features', (e) => {
    
    if (e.features && e.features.length > 0) {
      const longitude = e.features[0]?.properties?.['longitude'];
      const latitude = e.features[0]?.properties?.['latitude'];
      if (this.map) {
        this.map.flyTo({
          center: new mapboxgl.LngLat(longitude, latitude),
          zoom: 17.5
        });
        this.geoJsonService.emitClickEvent(latitude, longitude);
      }
    }
  });
  
  }

  updateSource(geoJsonObject: any) {
    if (this.map && this.map.getSource('features')) {
      (this.map.getSource('features') as mapboxgl.GeoJSONSource).setData(geoJsonObject);
    }
  }

 
   addDrawFeatures(map: mapboxgl.Map, geoJsonObject: any){
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true
      },
    });
    map.addControl(draw, 'top-right');
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-left');

    // Optional: Add event listeners for drawing and editing polygons
    map.on('draw.create', (e) => this.handleDrawEvent(e, draw, geoJsonObject));  
   }

  handleDrawEvent(e: any, draw: any, geoJsonObject: any) {

    const jsonData = {
      "coordinates": draw.getAll().features[0].geometry.coordinates[0],
      "propertyNames": this.geoJsonPropertyNames,
      "featuresLength": geoJsonObject.features.length
    }

    const jsonDataString = JSON.stringify(jsonData);
    this.apiHandler.sendReverseGeoCodeData(jsonDataString).subscribe(
      (response) => {
        console.log(response.message); // Handle successful response
        this.newGeoJson = JSON.parse(response.user_data)
        const newBuildinglongitude = this.newGeoJson.properties.longitude;
        const newBuildingLatitude = this.newGeoJson.properties.latitude;
     
        this.geoJsonService.setMapCoordinates(newBuildingLatitude, newBuildinglongitude);
        this.geoJsonService.insertNewBuildingInTable(this.newGeoJson);
        draw.deleteAll();
      },
      (errorResponse) => {
        console.error(errorResponse.error.message); // Handle error response
      });

  }


  flyToCoordinates(longitude: number, latitude: number) {
    if (this.map) {
      this.map.flyTo({
        center: new mapboxgl.LngLat(longitude, latitude),
        zoom: this.zoomLevel,
        essential: true
      });
    }
  }


  updateZoomLevelForDeletion(): void {
    this.zoomLevel = 17.25; 
  }

  setMapCenterAndZoom(longitude: number, latitude: number) {
    if (this.map) {
      // Set map center and zoom level directly
      this.map.setCenter([longitude, latitude]);
      this.map.setZoom(this.zoomLevel);
    }
  }


}
