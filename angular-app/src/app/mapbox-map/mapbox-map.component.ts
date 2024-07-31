import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { GeoJsonService } from '../services/geojson.service';
import * as mapboxgl from 'mapbox-gl';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mapbox-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mapbox-map.component.html',
  styleUrls: ['./mapbox-map.component.css']
})
export class MapboxMapComponent implements OnInit, OnDestroy {
  map: mapboxgl.Map | undefined;
  style = 'mapbox://styles/mapbox/streets-v11';
  lat: number = 30.2672;
  lng: number = -97.7431;
  buildingArray: any[] = [];
  private zoomLevel: number = 15;
  private geoJsonSubscription: Subscription | undefined;
  private featureClickSubscription: Subscription | undefined;
  private mapCoordinatesSubscription: Subscription | undefined;

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
    if (!geoJsonObject || !geoJsonObject.features || geoJsonObject.features.length === 0) {
      console.error("Invalid GeoJSON data or no features found");
      return;
    }

    this.buildingArray = geoJsonObject.features;
    this.cdr.detectChanges();
    const firstBuilding = this.buildingArray[0];
    const firstBuildingLongitude = firstBuilding.properties.longitude;
    const firstBuildingLatitude = firstBuilding.properties.latitude;
    this.geoJsonService.setMapCoordinates(firstBuildingLatitude, firstBuildingLongitude);

    this.map = new mapboxgl.Map({
      accessToken: environment.mapboxToken,
      container: 'map', // map is id of div in html
      style: this.style,
      attributionControl: false,
      zoom: this.zoomLevel,
      center: [firstBuildingLongitude, firstBuildingLatitude] // [longitude, latitude]
    });

    

    this.map.on('load', () => {
      if (!this.map) return; // if map not initialized, exit load

    
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
          const longitude = e.features[0].properties.longitude;
          const latitude = e.features[0].properties.latitude;
          if (this.map) {
            this.map.flyTo({
              center: new mapboxgl.LngLat(longitude, latitude),
              zoom: 17.5
            });
            this.geoJsonService.emitClickEvent(latitude, longitude);
          }
        }
      });
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
    this.zoomLevel = 17.5; // Set zoom level to 17.5 on feature deletion
  }

  setMapCenterAndZoom(longitude: number, latitude: number) {
    if (this.map) {
      // Set map center and zoom level directly
      this.map.setCenter([longitude, latitude]);
      this.map.setZoom(this.zoomLevel);
    }
  }

}
