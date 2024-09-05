import { CommonModule } from '@angular/common';
import type { OnDestroy, OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { Subscription } from 'rxjs';
import { FirstTableComponent } from '../first-table/first-table.component';
import { FileUploadComponent } from './file-upload/file-upload.component';
import { FileExportService } from '../services/file-export.service';
import { GeoJsonService } from '../services/geojson.service';
import { FlaskRequests } from '../services/server.service';
import LZString from 'lz-string';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  imports: [ReactiveFormsModule, CommonModule, FirstTableComponent, FileUploadComponent]
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
    sessionStorage.setItem('HOMEACCESS', JSON.stringify(true));
    sessionStorage.setItem('CURRENTPAGE', '');
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
}
