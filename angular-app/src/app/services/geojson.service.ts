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

  emitClickEvent(latitude: number, longitude: number): void {
    this.clickEventSubject.next({ latitude, longitude });
  }
  
  emitSelectedFeature(latitude: number, longitude: number): void {
    this.selectedFeatureSubject.next({ latitude, longitude });
  }
}
