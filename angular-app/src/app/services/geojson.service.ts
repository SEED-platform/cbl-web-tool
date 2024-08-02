import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: any[]; // Adjust based on the expected coordinate structure
  };
  properties: {
    [key: string]: any; // Allows for any property
  };
}

@Injectable({
  providedIn: 'root'
})


export class GeoJsonService {
  private geoJsonSubject: BehaviorSubject<any> = new BehaviorSubject<any>(this.getGeoJsonFromSessionStorage());

  private clickEventSubject = new BehaviorSubject<{ latitude: number, longitude: number } | null>(null);
  public clickEvent$: Observable<{ latitude: number, longitude: number } | null> = this.clickEventSubject.asObservable();
  
  private selectedFeatureSubject = new BehaviorSubject<{ latitude: number, longitude: number } | null>(null);
  public selectedFeature$: Observable<{ latitude: number, longitude: number } | null> = this.selectedFeatureSubject.asObservable();

  private mapCoordinatesSubject = new BehaviorSubject<{ latitude: number, longitude: number } | null>(null);
  public mapCoordinates$: Observable<{ latitude: number, longitude: number } | null> = this.mapCoordinatesSubject.asObservable();

  private newBulidingSubject = new BehaviorSubject<GeoJsonFeature | null>(null);
  public newBulding$: Observable<GeoJsonFeature | null> = this.newBulidingSubject.asObservable();




  constructor() { }

  private getGeoJsonFromSessionStorage(): any {
    return JSON.parse(sessionStorage.getItem("GEOJSONDATA") || '{}');
  }

  setGeoJson(serverGeoJson: any): void {
    
    this.geoJsonSubject.next(serverGeoJson);
    sessionStorage.setItem("GEOJSONDATA", JSON.stringify(serverGeoJson));
    console.log("set", serverGeoJson);
  }

  getGeoJson(): Observable<any> {
    return this.geoJsonSubject.asObservable();
  }

  updateGeoJsonFromMap(mapRemovedObject: any): void{

    if (!mapRemovedObject || mapRemovedObject.properties.latitude === undefined || mapRemovedObject.properties.longitude === undefined) {
      console.error('Invalid object to remove');
      return;
    }
    const { latitude, longitude } = mapRemovedObject.properties;


    const currentGeoJson = this.geoJsonSubject.getValue();
    let updatedGeoJson: any;
    
    
       updatedGeoJson = currentGeoJson.features.filter((feature: any) => {
         return feature.properties.latitude !== latitude || feature.properties.longitude !== longitude;
         });
    
    currentGeoJson.features = updatedGeoJson;
  
    this.geoJsonSubject.next(currentGeoJson);
    this.setGeoJson(currentGeoJson);
    this.mapCoordinatesSubject.next({latitude, longitude});
  }

  insertNewBuildingInTable(buildingObject: GeoJsonFeature): void {
    console.log('Emitting new building:', buildingObject);
    this.newBulidingSubject.next(buildingObject);
  }

  insertNewBuildingInGeoJson(buildingObject: GeoJsonFeature): void{
    const currentGeoJson = this.geoJsonSubject.getValue();
    currentGeoJson.features.unshift(buildingObject);
    this.setGeoJson(currentGeoJson);
  
  }

  emitClickEvent(latitude: number, longitude: number): void {
    this.clickEventSubject.next({ latitude, longitude });
  }
  
  emitSelectedFeature(latitude: number, longitude: number): void {
    this.selectedFeatureSubject.next({ latitude, longitude });
  }

  setMapCoordinates(latitude: number, longitude:number): void{
    this.mapCoordinatesSubject.next({latitude, longitude});
  }

  getCurrentCoordinates(): { latitude: number, longitude: number } | null {
    return this.mapCoordinatesSubject.getValue();
  }


}
