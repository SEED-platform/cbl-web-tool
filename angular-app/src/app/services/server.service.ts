import { HttpClient} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class FlaskRequests {

  // Inject HttpClient into the service
  constructor(private http: HttpClient) {}

  sendInitialData(fileData: FormData): Observable<any> {
    console.log("tried submittin");
    return this.http.post<any>('http://127.0.0.1:5001/api/submit_file', fileData );
  }

  // Method to send data to the API
  sendData(fileData: FormData): Observable<any> {
    return this.http.post<any>('http://127.0.0.1:5001/api/submit_file', fileData );
  }

  checkData(jsonString: string): Observable<any> {
    return this.http.post<any>('http://127.0.0.1:5001/api/check_data',  { value: jsonString }, // Send JSON object with 'value' key
      { headers: { 'Content-Type': 'application/json' }});
  }

  sendJsonData(jsonString: string): Observable<any> {
    return this.http.post<any>('http://127.0.0.1:5001/api/generate_cbl', { value: jsonString }, // Send JSON object with 'value' key
      { headers: { 'Content-Type': 'application/json' }});
}

  sendFinalExportJsonData(jsonString: string): Observable<any> {
  return this.http.post<any>('http://127.0.0.1:5001/api/export_geojson', { value: jsonString }, // Send JSON object with 'value' key
    { headers: { 'Content-Type': 'application/json'}});
  }
}