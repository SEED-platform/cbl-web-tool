import { Component, ChangeDetectorRef, OnInit, OnDestroy,ViewEncapsulation } from '@angular/core';
import { GeoJsonService } from '../services/geojson.service';
import { FlaskRequests } from '../services/server.service';
import * as mapboxgl from 'mapbox-gl';
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { CommonModule, JsonPipe } from '@angular/common';
import { environment } from '../../environments/environment';
import { Subscription } from 'rxjs';
import { NewBuildingButton } from './new-buliding-button';
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
  private clickedBuildingId: string = "";
  private selectedPolygonId: string ="";
  constructor(private cdr: ChangeDetectorRef, private geoJsonService: GeoJsonService, private apiHandler: FlaskRequests) {}

  ngOnInit() {
    this.geoJsonSubscription = this.geoJsonService.getGeoJson().subscribe(geoJsonObject => {
      this.initializeMapWithGeoJson(geoJsonObject);
      this.geoJsonPropertyNames = JSON.parse(sessionStorage.getItem("GEOJSONPROPERTYNAMES") || "[]");
    });

    this.featureClickSubscription = this.geoJsonService.selectedFeature$.subscribe(feature => {
      if (feature) {
        const { id } = feature;
      
        if (id !== undefined && (feature.latitude.toString() !== '0' && feature.latitude.toString()  !== '0')) {
          this.flyToCoordinatesWithZoom(feature.longitude, feature.latitude);
          this.setActivePolygon(id);
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
        this.addDrawFeatures(this.map, geoJsonObject);
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
  

    if (featureIds && featureIds.length > 0) {
        // Assuming featureIds[0] is the ID of the clicked feature
        const clickedFeatureId = featureIds[0];
     

        // Find the corresponding feature in geoJsonObject
        const clickedFeature = geoJsonObject.features.find((feature: any) => feature.id === String(clickedFeatureId));
        if (clickedFeature) {
            this.resetPolygonColor(this.clickedBuildingId);
            this.clickedBuildingId = clickedFeature.id;
            const { latitude, longitude } = clickedFeature.properties;
            //reset any clicked polygon outline
           
   
            // Emit the click event with the latitude and longitude
            this.geoJsonService.setIsDataSentFromTable(true);
            this.geoJsonService.emitClickEvent(latitude, longitude, Number(this.clickedBuildingId));     
            //this.geoJsonService.setMapCoordinates(latitude, longitude);
        } else {
            console.error(`Feature with ID ${clickedFeatureId} not found in geoJsonObject.`);
        }
        } else {
        console.warn('No features found at the click point.');
        }
};


   addDrawFeatures(map: mapboxgl.Map, geoJsonObject: any){
    this.draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        //polygon: true,
        trash: true,
      },
      defaultMode: 'simple_select' ,
      userProperties: true,
      styles: [
          // default themes provided by MB Draw
          // default themes provided by MB Draw
          // default themes provided by MB Draw
          // default themes provided by MB Draw


          {
              'id': 'gl-draw-polygon-fill-inactive',
              'type': 'fill',
              'filter': ['all', ['==', 'active', 'false'],
                  ['==', '$type', 'Polygon'],
                  ['!=', 'mode', 'static']
              ],
              'paint': {
                  'fill-color': '#3bb2d0',
                  'fill-outline-color': '#3bb2d0',
                  'fill-opacity': 0.1
              }
          },
          {
              'id': 'gl-draw-polygon-fill-active',
              'type': 'fill',
              'filter': ['all', ['==', 'active', 'true'],
                  ['==', '$type', 'Polygon']
              ],
              'paint': {
                  'fill-color': 'pink',
                  'fill-outline-color': '#fbb03b',
                  'fill-opacity': 0.6
              }
          },
          {
              'id': 'gl-draw-polygon-midpoint',
              'type': 'circle',
              'filter': ['all', ['==', '$type', 'Point'],
                  ['==', 'meta', 'midpoint']
              ],
              'paint': {
                  'circle-radius': 3,
                  'circle-color': '#fbb03b'
              }
          },
          {
              'id': 'gl-draw-polygon-stroke-inactive',
              'type': 'line',
              'filter': ['all', ['==', 'active', 'false'],
                  ['==', '$type', 'Polygon'],
                  ['!=', 'mode', 'static']
              ],
              'layout': {
                  'line-cap': 'round',
                  'line-join': 'round'
              },
              'paint': {
                  'line-color': '#3bb2d0',
                  'line-width': 2
              }
          },
          {
              'id': 'gl-draw-polygon-stroke-active',
              'type': 'line',
              'filter': ['all', ['==', 'active', 'true'],
                  ['==', '$type', 'Polygon']
              ],
              'layout': {
                  'line-cap': 'round',
                  'line-join': 'round'
              },
              'paint': {
                  'line-color': '#fbb03b',
                  'line-dasharray': [0.2, 2],
                  'line-width': 2
              }
          },
          {
              'id': 'gl-draw-line-inactive',
              'type': 'line',
              'filter': ['all', ['==', 'active', 'false'],
                  ['==', '$type', 'LineString'],
                  ['!=', 'mode', 'static']
              ],
              'layout': {
                  'line-cap': 'round',
                  'line-join': 'round'
              },
              'paint': {
                  'line-color': '#3bb2d0',
                  'line-width': 2
              }
          },
          {
              'id': 'gl-draw-line-active',
              'type': 'line',
              'filter': ['all', ['==', '$type', 'LineString'],
                  ['==', 'active', 'true']
              ],
              'layout': {
                  'line-cap': 'round',
                  'line-join': 'round'
              },
              'paint': {
                  'line-color': '#fbb03b',
                  'line-dasharray': [0.2, 2],
                  'line-width': 2
              }
          },
          {
              'id': 'gl-draw-polygon-and-line-vertex-stroke-inactive',
              'type': 'circle',
              'filter': ['all', ['==', 'meta', 'vertex'],
                  ['==', '$type', 'Point'],
                  ['!=', 'mode', 'static']
              ],
              'paint': {
                  'circle-radius': 5,
                  'circle-color': '#fff'
              }
          },
          {
              'id': 'gl-draw-polygon-and-line-vertex-inactive',
              'type': 'circle',
              'filter': ['all', ['==', 'meta', 'vertex'],
                  ['==', '$type', 'Point'],
                  ['!=', 'mode', 'static']
              ],
              'paint': {
                  'circle-radius': 3,
                  'circle-color': '#fbb03b'
              }
          },
          {
              'id': 'gl-draw-point-point-stroke-inactive',
              'type': 'circle',
              'filter': ['all', ['==', 'active', 'false'],
                  ['==', '$type', 'Point'],
                  ['==', 'meta', 'feature'],
                  ['!=', 'mode', 'static']
              ],
              'paint': {
                  'circle-radius': 5,
                  'circle-opacity': 1,
                  'circle-color': '#fff'
              }
          },
          {
              'id': 'gl-draw-point-inactive',
              'type': 'circle',
              'filter': ['all', ['==', 'active', 'false'],
                  ['==', '$type', 'Point'],
                  ['==', 'meta', 'feature'],
                  ['!=', 'mode', 'static']
              ],
              'paint': {
                  'circle-radius': 3,
                  'circle-color': '#3bb2d0'
              }
          },
          {
              'id': 'gl-draw-point-stroke-active',
              'type': 'circle',
              'filter': ['all', ['==', '$type', 'Point'],
                  ['==', 'active', 'true'],
                  ['!=', 'meta', 'midpoint']
              ],
              'paint': {
                  'circle-radius': 7,
                  'circle-color': '#fff'
              }
          },
          {
              'id': 'gl-draw-point-active',
              'type': 'circle',
              'filter': ['all', ['==', '$type', 'Point'],
                  ['!=', 'meta', 'midpoint'],
                  ['==', 'active', 'true']
              ],
              'paint': {
                  'circle-radius': 5,
                  'circle-color': '#fbb03b'
              }
          },
          {
              'id': 'gl-draw-polygon-fill-static',
              'type': 'fill',
              'filter': ['all', ['==', 'mode', 'static'],
                  ['==', '$type', 'Polygon']
              ],
              'paint': {
                  'fill-color': '#404040',
                  'fill-outline-color': '#404040',
                  'fill-opacity': 0.1
              }
          },
          {
              'id': 'gl-draw-polygon-stroke-static',
              'type': 'line',
              'filter': ['all', ['==', 'mode', 'static'],
                  ['==', '$type', 'Polygon']
              ],
              'layout': {
                  'line-cap': 'round',
                  'line-join': 'round'
              },
              'paint': {
                  'line-color': '#404040',
                  'line-width': 2
              }
          },
          {
              'id': 'gl-draw-line-static',
              'type': 'line',
              'filter': ['all', ['==', 'mode', 'static'],
                  ['==', '$type', 'LineString']
              ],
              'layout': {
                  'line-cap': 'round',
                  'line-join': 'round'
              },
              'paint': {
                  'line-color': '#404040',
                  'line-width': 2
              }
          },
          {
              'id': 'gl-draw-point-static',
              'type': 'circle',
              'filter': ['all', ['==', 'mode', 'static'],
                  ['==', '$type', 'Point']
              ],
              'paint': {
                  'circle-radius': 5,
                  'circle-color': '#404040'
              }
          },
          {
              'id': 'gl-draw-polygon-color-picker',
              'type': 'fill',
              'filter': ['all', ['==', '$type', 'Polygon'],
                  ['has', 'user_portColor']
              ],
              'paint': {
                  'fill-color': ['get', 'user_portColor'],
                  'fill-outline-color': ['get', 'user_portColor'],
                  'fill-opacity': ['get', 'user_portOpacity']
              }
          },
          {
              'id': 'gl-draw-line-color-picker',
              'type': 'line',
              'filter': ['all', ['==', '$type', 'LineString'],
                  ['has', 'user_portColor']
              ],
              'paint': {
                  'line-color': ['get', 'user_portColor'],
                  'line-width': 2
              }
          },
          {
              'id': 'gl-draw-point-color-picker',
              'type': 'circle',
              'filter': ['all', ['==', '$type', 'Point'],
                  ['has', 'user_portColor']
              ],
              'paint': {
                  'circle-radius': 3,
                  'circle-color': ['get', 'user_portColor']
              }
          }  
      ]

    });
    const addNewBuildingButton = new NewBuildingButton(() => this.createNewBuilding());

    map.addControl(addNewBuildingButton, "top-right");
    map.addControl(this.draw, 'top-right');
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-left');

    geoJsonObject.features.forEach((feature: any) => {
  
      if (feature.geometry && feature.geometry.type === 'Polygon' && feature.properties.latitude !== '0' && feature.properties.longitude !== "0" && (feature.properties.ubid !== 0 ||  feature.properties.ubid !== '0')) {
        this.draw?.add({
          id: feature.id,
          type: 'Feature',
          properties: feature.properties,
          geometry: {
            type: 'Polygon',
            coordinates: feature.geometry.coordinates
          }
        });
      }
    })
    
    
     map.on('draw.create', (e) => this.handleDrawEvent(e, this.draw, geoJsonObject)); 
     map.on('draw.delete', (e) => this.handleDeleteEvent(e, this.draw, geoJsonObject)); 
     map.on('draw.update', (e) => this.handleEditEvent(e, this.draw, geoJsonObject));
   }

  handleEditEvent(e: any, draw: any, geoJsonObject: any) {
   
    const newBuildingCoordinates =  e.features[0].geometry.coordinates[0];
    let newBuildingId = 0;
    console.log("edit", geoJsonObject);
    if(this.clickedBuildingId === "New Building"){
       newBuildingId = geoJsonObject.features.length - 1;
       console.log("selected Buidlign id", newBuildingId);
     } else{
       newBuildingId =  e.features[0].id;
    }
    const jsonData = {
      "coordinates": newBuildingCoordinates,
      "propertyNames": this.geoJsonPropertyNames,
    }

    const jsonDataString = JSON.stringify(jsonData);
   
      this.apiHandler.sendEditedPolygonData(jsonDataString).subscribe(
      (response) => {
        console.log(response.message); // Handle successful response
        this.newGeoJson = JSON.parse(response.user_data)
  
        const newBuildingLongitude = this.newGeoJson.lon;
        const newBuildingLatitude = this.newGeoJson.lat;
        const newBuildingUbid = this.newGeoJson.ubid;
        
        
      this.geoJsonService.setMapCoordinates(newBuildingLatitude, newBuildingLongitude); 
       this.geoJsonService.setIsDataSentFromTable(true);
       this.geoJsonService.modifyBuildingInTable(newBuildingCoordinates, newBuildingLatitude, newBuildingLongitude, newBuildingUbid, newBuildingId);
      },
      (errorResponse) => {
        console.error(errorResponse.error.message); // Handle error response
      });

  }


  handleDeleteEvent(e: any, draw: any, geoJsonObject: any) {
   
    const newBuildingCoordinates =  e.features[0].geometry.coordinates[0];
    const newBuildingId =  e.features[0].id
    console.log("in map", e.features[0])
    
   
        const newBuildingLongitude = 0;
        const newBuildingLatitude = 0;
        const newBuildingUbid: any = 0;
        
        
     //   this.geoJsonService.setMapCoordinates(newBuildingLatitude, newBuildingLongitude);
         
       // this.geoJsonService.insertNewBuildingInTable(this.newGeoJson);
       this.selectedPolygonId = "";
       this.geoJsonService.setIsDataSentFromTable(true);
       this.geoJsonService.modifyBuildingInTable(newBuildingCoordinates, newBuildingLatitude, newBuildingLongitude, newBuildingUbid, newBuildingId);

  }

  createNewBuilding(){
    console.log(this.draw?.getAll())
    if(this.clickedBuildingId !== ""){
    this.resetPolygonColor(this.clickedBuildingId);
    }
    this.clickedBuildingId = "New Building"
    this.draw?.changeMode('draw_polygon');
    this.geoJsonService.emitClickEvent(-1, -1, -1);     
  }


  handleDrawEvent(e: any, draw: any, geoJsonObject: any) {
   
    const newBuildingCoordinates =  e.features[0].geometry.coordinates[0];
    const newBuildingId =  geoJsonObject.features.length.toString();
    const jsonData = {
      "coordinates": newBuildingCoordinates,
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
       
      },
      (errorResponse) => {
        console.error(errorResponse.error.message); // Handle error response
      });
  }

  setActivePolygon(polygonId: any) {


     
      if (this.draw) {

        const polygon = this.draw.get(polygonId);
        // Reset color of the previously selected polygon, if any
        console.log("trying to set properties", polygon)

       if(polygon?.properties !== undefined){
        if (!(this.selectedPolygonId === "")) {
          this.resetPolygonColor(this.selectedPolygonId);
        }
    
        // Update the current selected polygon ID
        this.selectedPolygonId = polygonId;
         console.log("comingin", this.draw.get(polygonId))
         this.clickedBuildingId = polygonId;
         
         
         if(polygon?.properties !== undefined && polygon?.properties?.['portColor'] !== 'yellow'){
          console.log(polygon?.properties?.['portColor'])
         this.draw?.setFeatureProperty(polygonId, 'portColor', 'yellow');
         this.draw?.setFeatureProperty(polygonId, 'portOpacity', 0.3);
         console.log(polygon?.properties?.['portColor'])

         var feat = this.draw?.get(polygonId);
         if (feat !== undefined)
            this.draw?.add(feat)

         console.log(feat, "new added")
        }
      }
    }
  }


  resetPolygonColor(polygonId: any) {
    console.log(this.clickedBuildingId)
    if (this.draw && this.clickedBuildingId !== 'New Building') {
      // Retrieve the feature

        // Reset the color to the default or another color
        const polygon = this.draw.get(polygonId);
        console.log("checking polygon", polygon)
        
       if(polygon?.properties !== undefined){
        if(polygon?.properties?.['portColor'] !== '#3bb2d0'){
        this.draw.setFeatureProperty(polygonId, 'portColor', '#3bb2d0'); // Default color
        this.draw?.setFeatureProperty(polygonId, 'portOpacity', 0.0);
        const feature = this.draw.get(polygonId);
        if (feature !== undefined)
        this.draw.add(feature); // Update the feature style
        console.log("reset", feature)
      }
     }

    }
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
