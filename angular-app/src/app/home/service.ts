import { HttpClient} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class FlaskRequests {

  // Inject HttpClient into the service
  constructor(private http: HttpClient) {}

  // Method to send data to the API
  sendData(fileData: FormData): Observable<any> {
    return this.http.post<any>('http://127.0.0.1:5001/api/submit_file', fileData );
  }
}