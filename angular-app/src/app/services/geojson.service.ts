import { Injectable } from '@angular/core';


@Injectable({
  providedIn: 'root'
})

export class GeoJsonService {
  protected geoJson: any = {};
  jsonDataString: string = "";

  constructor() { }

  setGeoJson(serverGeoJson: Object): void {
    this.geoJson = serverGeoJson;
    sessionStorage.setItem("GEOJSONDATA", JSON.stringify(serverGeoJson));
    console.log("set", this.geoJson);
  }

  getGeoJson() {
    this.geoJson = JSON.parse(sessionStorage.getItem("GEOJSONDATA") || '{}');
    return this.geoJson;
  }

}
