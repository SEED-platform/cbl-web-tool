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
  private draw: MapboxDraw | undefined;
  private clickedBuildingId: number = 0;
  constructor(private cdr: ChangeDetectorRef, private geoJsonService: GeoJsonService, private apiHandler: FlaskRequests) {}

  ngOnInit() {
    this.geoJsonSubscription = this.geoJsonService.getGeoJson().subscribe(geoJsonObject => {
      this.initializeMapWithGeoJson(geoJsonObject);
      this.geoJsonPropertyNames = JSON.parse(sessionStorage.getItem("GEOJSONPROPERTYNAMES") || "[]");
    });

    this.featureClickSubscription = this.geoJsonService.selectedFeature$.subscribe(feature => {
      if (feature) {
        const { latitude, longitude, id } = feature;
        
        
        if (id !== undefined) {
          this.flyToCoordinatesWithZoom(longitude, latitude);
          this.setActivePolygon(id.toString());
        }
      }
    });

    this.mapCoordinatesSubscription = this.geoJsonService.mapCoordinates$.subscribe(feature => {
      if (feature) {
        this.updateZoomLevelForDeletion();
        //this.setMapCenterAndZoom(feature.longitude, feature.latitude); // Update map view based on new coordinates
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
        this.addDrawFeatures(this.map, geoJsonObject);
      }
    }    
    });
  }else{
    
  }

  this.map.on("click", (event) => this.handleClick(event, geoJsonObject));

  
  }
  


  handleClick = (event: any, geoJsonObject: any) => {
    if (!this.map || !this.draw) return;

    // Get the feature IDs under the click point
    const featureIds = this.draw.getFeatureIdsAt(event.point);
    console.log(featureIds)
    console.log(this.map.queryRenderedFeatures(event.point));

    if (featureIds && featureIds.length > 0) {
        // Assuming featureIds[0] is the ID of the clicked feature
        const clickedFeatureId = featureIds[0];

        console.log(featureIds)

        // Find the corresponding feature in geoJsonObject
        const clickedFeature = geoJsonObject.features.find((feature: any) => feature.id === String(clickedFeatureId));

        if (clickedFeature) {
            this.clickedBuildingId = clickedFeature.id;
            const { latitude, longitude } = clickedFeature.properties;
            //reset any clicked polygon outline
           
   
            // Emit the click event with the latitude and longitude
            this.geoJsonService.setIsDataSentFromTable(true);
            this.geoJsonService.emitClickEvent(latitude, longitude);     
            //this.geoJsonService.setMapCoordinates(latitude, longitude);
        } else {
            console.error(`Feature with ID ${clickedFeatureId} not found in geoJsonObject.`);
        }
    } else {
        console.warn('No features found at the click point.');
    }
};



  updateSource(geoJsonObject: any) {
    if (this.map && this.map.getSource('features')) {
      (this.map.getSource('features') as mapboxgl.GeoJSONSource).setData(geoJsonObject);
    }
  }

 
   addDrawFeatures(map: mapboxgl.Map, geoJsonObject: any){
    this.draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: 'simple_select' 
    });
    map.addControl(this.draw, 'top-right');
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-left');

    geoJsonObject.features.forEach((feature: any) => {
  
      if (feature.geometry && feature.geometry.type === 'Polygon') {
        this.draw?.add({
          id: Number(feature.id),
          type: 'Feature',
          properties: feature.properties,
          geometry: {
            type: 'Polygon',
            coordinates: feature.geometry.coordinates
          }
        });
      }
    })
    
    // Optional: Add event listeners for drawing and editing polygons
    // map.on('draw.create', (e) => this.handleDrawEvent(e, this.draw, geoJsonObject));  
    map.on('draw.update', (e) => this.handleEditEvent(e, this.draw, geoJsonObject));
   }

  handleEditEvent(e: any, draw: any, geoJsonObject: any) {
   
    const newBuildingCoordinates =  e.features[0].geometry.coordinates[0];
    const newBuildingId =  e.features[0].id;
    console.log(newBuildingId);
    const jsonData = {
      "coordinates": newBuildingCoordinates,
      "propertyNames": this.geoJsonPropertyNames,
     // "featuresLength": geoJsonObject.features.length
    }

    const jsonDataString = JSON.stringify(jsonData);
    // this.apiHandler.sendReverseGeoCodeData(jsonDataString).subscribe(
    //   (response) => {
    //     console.log(response.message); // Handle successful response
    //     this.newGeoJson = JSON.parse(response.user_data)
    //     const newBuildinglongitude = this.newGeoJson.properties.longitude;
    //     const newBuildingLatitude = this.newGeoJson.properties.latitude;
     
    //     this.geoJsonService.setMapCoordinates(newBuildingLatitude, newBuildinglongitude);
    //     this.geoJsonService.insertNewBuildingInTable(this.newGeoJson);
    //     draw.deleteAll();
    //   },
    //   (errorResponse) => {
    //     console.error(errorResponse.error.message); // Handle error response
    //   });
      this.apiHandler.sendEditedPolygonData(jsonDataString).subscribe(
      (response) => {
        console.log(response.message); // Handle successful response
        this.newGeoJson = JSON.parse(response.user_data)
        console.log(this.newGeoJson)
        const newBuildingLongitude = this.newGeoJson.lon;
        const newBuildingLatitude = this.newGeoJson.lat;
        const newBuildingUbid = this.newGeoJson.ubid;
        
        
     //   this.geoJsonService.setMapCoordinates(newBuildingLatitude, newBuildingLongitude);
         
       // this.geoJsonService.insertNewBuildingInTable(this.newGeoJson);
       
       this.geoJsonService.setIsDataSentFromTable(true);
       this.geoJsonService.modifyBuildingInTable(newBuildingCoordinates, newBuildingLatitude, newBuildingLongitude, newBuildingUbid, newBuildingId);
      },
      (errorResponse) => {
        console.error(errorResponse.error.message); // Handle error response
      });

  }

   setActivePolygon(polygonId: string) {
    if (!this.draw) return;
    // Deselect all features

    this.draw.changeMode('simple_select')
    this.draw.changeMode('simple_select', { featureIds: [polygonId] })
   
  }
  


  flyToCoordinates(longitude: number, latitude: number) {
    if (this.map) {
      this.map.flyTo({
        center: new mapboxgl.LngLat(longitude, latitude),
        zoom: this.map.getZoom(),
        essential: true
      });
    }
  }


  flyToCoordinatesWithZoom(longitude: number, latitude: number) {
    if (this.map) {
      this.map.flyTo({
        center: new mapboxgl.LngLat(longitude, latitude),
        zoom: 17.25,
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
