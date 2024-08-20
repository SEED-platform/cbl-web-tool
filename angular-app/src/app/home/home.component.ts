import { CommonModule } from '@angular/common';
import type { OnDestroy, OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { Subscription } from 'rxjs';
import { CblTableComponent } from '../cbl-table/cbl-table.component';
import { FirstTableComponent } from '../first-table/first-table.component';
import { MapboxMapComponent } from '../mapbox-map/mapbox-map.component';
import { FileExportService } from '../services/file-export.service';
import { GeoJsonService } from '../services/geojson.service';
import { FlaskRequests } from '../services/server.service';
import LZString from 'lz-string';

// Compress a string
const compressed = LZString.compress('Hello, World!');

// Decompress the string
const decompressed = LZString.decompress(compressed);

console.log('Compressed:', compressed);
console.log('Decompressed:', decompressed);

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  imports: [ReactiveFormsModule, CommonModule, MapboxMapComponent, FirstTableComponent, CblTableComponent]
})
export class HomeComponent implements OnInit, OnDestroy {
  userFile: any;
  jsonData: any;
  initialJsonData: any;
  fatalErrorArray: string[] = ['Uploaded a file in the wrong format. Please upload different format', 'Failed to read file.'];
  private geoJsonSubscription?: Subscription;

  constructor(
    private apiHandler: FlaskRequests,
    private fileExportHandler: FileExportService,
    private router: Router,
    private geoJsonService: GeoJsonService
  ) {}

  ngOnInit() {
    this.geoJsonSubscription = this.geoJsonService.getGeoJson().subscribe((data) => {
      this.jsonData = data;
      if (this.jsonData && this.jsonData.features && this.jsonData.features.length > 0 && this.jsonData.features[0].properties) {
        const geoJsonPropertyNames = Object.keys(this.jsonData.features[0].properties);
        sessionStorage.setItem('GEOJSONPROPERTYNAMES', JSON.stringify(geoJsonPropertyNames));
      }
    });
  }

  ngOnDestroy() {
    this.geoJsonSubscription?.unsubscribe();
  }

  isObjectEmpty(obj: object): boolean {
    return !obj || (Object.keys(obj).length === 0 && obj.constructor === Object);
  }

  getUploadFileFromUser(event: any) {
    this.userFile = event.target.files[0];
  }

  uploadInitialFileToServer() {
    const fileData = new FormData();

    fileData.append('userFile', this.userFile);
    this.apiHandler.sendInitialData(fileData).subscribe(
      (response) => {
        console.log(response.message); // Handle successful response
        this.initialJsonData = response.user_data;
        sessionStorage.setItem('FIRSTTABLEDATA', LZString.compress(this.initialJsonData));
        if (this.userFile) {
          this.router.navigate(['/first-table']);
        }
      },
      (errorResponse) => {
        console.log(errorResponse.error.message); // Handle error response

        if (this.userFile && !this.fatalErrorArray.includes(errorResponse.error.message)) {
          this.initialJsonData = errorResponse.error.user_data;
          sessionStorage.setItem('FIRSTTABLEDATA', LZString.compress(this.initialJsonData));
          console.log(this.initialJsonData);
          this.router.navigate(['/first-table']);
        } else {
          alert(errorResponse.error.message);
        }
      }
    );
  }
}
