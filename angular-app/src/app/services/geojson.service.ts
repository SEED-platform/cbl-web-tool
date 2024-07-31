import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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



  constructor() { }

  private getGeoJsonFromSessionStorage(): any {
    return JSON.parse(sessionStorage.getItem("GEOJSONDATA") || '{}');
  }

  setGeoJson(serverGeoJson: Object): void {
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
    console.log("b4r",currentGeoJson)

    const updatedGeoJson = currentGeoJson.features.filter((feature: any) => {
      return feature.properties.latitude !== latitude || feature.properties.longitude !== longitude;
    });
   
    currentGeoJson.features = updatedGeoJson;
    console.log("aftr", currentGeoJson)
    this.geoJsonSubject.next(currentGeoJson);
    this.setGeoJson(currentGeoJson);
    this.mapCoordinatesSubject.next({latitude, longitude});
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
}
