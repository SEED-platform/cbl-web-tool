import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: any[]; // Adjust based on the expected coordinate structure
  };
  id: string;
  properties: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})


export class GeoJsonService {

  private isSentFromTable = false; // Flag to track selection source
  private geoJsonSubject: BehaviorSubject<any> = new BehaviorSubject<any>(this.getGeoJsonFromSessionStorage());

  private clickEventSubject = new BehaviorSubject<{ latitude: number, longitude: number, id: string } | null>(null);
  public clickEvent$: Observable<{ latitude: number, longitude: number, id: string } | null> = this.clickEventSubject.asObservable();

  private selectedFeatureSubject = new BehaviorSubject<{ latitude: number, longitude: number, id: string, quality: string } | null>(null);
  public selectedFeature$: Observable<{ latitude: number, longitude: number, id: string, quality: string } | null> = this.selectedFeatureSubject.asObservable();

  private mapCoordinatesSubject = new BehaviorSubject<{ latitude: number, longitude: number } | null>(null);
  public mapCoordinates$: Observable<{ latitude: number, longitude: number } | null> = this.mapCoordinatesSubject.asObservable();

  private newBuildingSubject = new BehaviorSubject<GeoJsonFeature | null>(null);
  public newBuilding$: Observable<GeoJsonFeature | null> = this.newBuildingSubject.asObservable();

  private modifyBuildingSubject = new BehaviorSubject<{ coordinates: number[], latitude: number, longitude: number, ubid: string, id: string } | null>(null);
  public modifyBuilding$: Observable<{ coordinates: number[], latitude: number, longitude: number, ubid: string, id: string } | null> = this.modifyBuildingSubject.asObservable();


  private removeBuildingSubject = new BehaviorSubject<{ id: string } | null>(null);
  public removeBuildingId$: Observable<{ id: string } | null> = this.removeBuildingSubject.asObservable();


  constructor() {
  }

  setGeoJson(serverGeoJson: any): void {

    this.geoJsonSubject.next(serverGeoJson);
    sessionStorage.setItem('GEOJSONDATA', JSON.stringify(serverGeoJson));
  }

  getGeoJson(): Observable<any> {
    return this.geoJsonSubject.asObservable();
  }

  updateGeoJsonFromMap(mapRemovedObject: any): void {
    if (!mapRemovedObject || mapRemovedObject.properties.ubid === undefined) {
      console.error('Invalid object to remove');
      return;
    }


    const { latitude, longitude } = mapRemovedObject.properties;
    const id = mapRemovedObject.id;
    console.log(mapRemovedObject, 'yurttrtrew');

    // Get the current GeoJSON from the subject
    const currentGeoJson = this.geoJsonSubject.getValue();

    // Clone the features array to avoid modifying the original array directly
    const features = [...currentGeoJson.features];

    // Find the index of the feature to remove
    const indexToRemove = features.findIndex((feature: any) => feature.id === id);
    console.log('IndexToRemove', indexToRemove);
    console.log('has been found???', features[indexToRemove]);
    // Remove the feature at the found index if it exists
    if (indexToRemove !== -1) {
      features.splice(indexToRemove, 1); // Remove the feature at the found index
    }

    // Update the GeoJSON with the modified features array
    const updatedGeoJson = {
      ...currentGeoJson,
      features: features
    };
    // Update the subject with the new GeoJSON
    this.setGeoJson(updatedGeoJson);
    console.log('Map remove object', updatedGeoJson);
    this.mapCoordinatesSubject.next({ latitude, longitude });
  }

  removeEntirePolygonRefInMap(id: string) {
    console.log('Emitting removeBuildingId:', id);
    this.removeBuildingSubject.next({ id });
  }

  insertNewBuildingInTable(buildingObject: GeoJsonFeature): void {
    this.newBuildingSubject.next(buildingObject);
  }

  modifyBuildingInGeoJson(modBuilding: any) {


    console.log(modBuilding);
    if (!modBuilding) {
      console.error('Invalid object to modify');
      return;
    }
    const { coordinates, latitude, longitude, ubid, id } = modBuilding;

    const currentGeoJson = this.geoJsonSubject.getValue();

    // Clone the features array to avoid modifying the original array directly
    const features = [...currentGeoJson.features];

    // Find the index of the feature to remove
    const index = features.findIndex((feature: any) => feature.id === id.toString());

    features[index].properties.ubid = ubid;
    features[index].geometry.coordinates = [coordinates];
    features[index].properties.latitude = latitude.toString();
    features[index].properties.longitude = longitude.toString();

    const updatedGeoJson = {
      ...currentGeoJson,
      features: features
    };
    this.geoJsonSubject.next(updatedGeoJson);

    // Optionally call additional methods or emit values as needed
    this.setGeoJson(updatedGeoJson);
    console.log('MODDED VALUE', updatedGeoJson);
    this.mapCoordinatesSubject.next({ latitude, longitude });

  }

  modifyBuildingInTable(coordinates: number[], latitude: number, longitude: number, ubid: string, id: string): void {

    const updatedBuilding = { coordinates, latitude, longitude, ubid, id };
    console.log(updatedBuilding);

    // Update the BehaviorSubject with the new building data
    this.modifyBuildingSubject.next(updatedBuilding);
  }

  modifyPoorBuildingInTable(coordinates: number[], latitude: number, longitude: number, ubid: string, id: string, quality: string): void {

    const updatedBuilding = { coordinates, latitude, longitude, ubid, id, quality };
    console.log(updatedBuilding);

    // Update the BehaviorSubject with the new building data
    this.modifyBuildingSubject.next(updatedBuilding);
  }

  insertNewBuildingInGeoJson(buildingObject: GeoJsonFeature): void {
    const currentGeoJson = this.geoJsonSubject.getValue();
    currentGeoJson.features.unshift(buildingObject);
    this.setGeoJson(currentGeoJson);
    console.log('NEW GEO IN SOURCE', currentGeoJson);
  }

  emitClickEvent(latitude: number, longitude: number, id: string): void {
    this.clickEventSubject.next({ latitude, longitude, id });
  }

  emitSelectedFeature(latitude: number, longitude: number, id: string, quality: string): void {
    this.selectedFeatureSubject.next({ latitude, longitude, id, quality });
  }

  setMapCoordinates(latitude: number, longitude: number): void {
    this.mapCoordinatesSubject.next({ latitude, longitude });
  }

  getCurrentCoordinates(): { latitude: number, longitude: number } | null {
    return this.mapCoordinatesSubject.getValue();
  }

  setIsDataSentFromTable(isTable: boolean): void {
    this.isSentFromTable = isTable;
  }

  isDataSentFromTable(): boolean {
    return this.isSentFromTable;
  }

  private getGeoJsonFromSessionStorage(): any {
    return JSON.parse(sessionStorage.getItem('GEOJSONDATA') || '{}');
  }

}
