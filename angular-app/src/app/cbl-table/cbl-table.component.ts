import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import {ColDef} from 'ag-grid-community';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { AgGridAngular } from 'ag-grid-angular';
import "ag-grid-community/styles/ag-grid.css";
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { FlaskRequests } from '../service';
import { Router } from '@angular/router';
import {ValueGetterParams} from "@ag-grid-community/core";
import Papa from 'papaparse';




@Component({
  selector: 'app-cbl-table',
  standalone: true,
  imports: [AgGridAngular, CommonModule],
  templateUrl: './cbl-table.component.html',
  styleUrl: './cbl-table.component.css'
})
export class CblTableComponent implements OnInit {
  featuresArray: any[] = [];
  colDefs: ColDef[] = [];
  geoJson: any;
  private gridApi: any;
  public rowData: any[] = []; 

  defaultColDef = {
    alwaysShowHorizontalScroll: true,
    flex: 1,
    minWidth: 100,
    sortable: false,
    filter: true,
    editable: true,
  };

  constructor(private apiHandler: FlaskRequests, private router: Router, private cdr: ChangeDetectorRef) { }

   
  onGridReady(params: any) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  
  ngOnInit(): void {
    this.parseGeoJson();
    this.featuresArray = this.geoJson.features;
    this.rowData = this.featuresArray;
    this.setColumnDefs();
    console.log("dsfas", this.rowData);
  }

  parseGeoJson(){
    try {
      this.geoJson = JSON.parse(sessionStorage.getItem('GEOJSONDATA') || '[]');
    } catch (e) {
      console.error("Failed to parse GeoJSON data:", e);
      this.geoJson = []; // Or handle it according to your needs
    }
  }



  setColumnDefs() {
        this.featuresArray = this.geoJson.features;
        let keys:any;
       
        keys = Object.keys(this.featuresArray[0].properties);     
        
        keys.push('coordinates');      
        console.log(keys)


      this.colDefs = keys.map((key:any) => ({
        field: key,
        headerName: key, 
        valueGetter: (params: ValueGetterParams) => {
          if (key === 'coordinates') {
            return params.data.geometry?.coordinates;
          }
          return params.data.properties[key];
        },   valueSetter: (params: any) => {
          if (key === 'coordinates') {
            params.data.geometry = params.data.geometry || {};
            params.data.geometry.coordinates = params.newValue;
          } else {
            params.data.properties[key] = params.newValue;
          }
          return true;
        },
      }));
    sessionStorage.setItem("COL", JSON.stringify(this.colDefs));
  }

  exportAsJson() {
    // Stop editing changes data without clicking off cell
    this.gridApi.stopEditing();
  
    // Get the data as CSV
    let csvUserData = this.gridApi.getDataAsCsv();
    
    // Convert CSV to JSON using PapaParse
    let jsonString:string;
    try {
      jsonString = JSON.stringify(Papa.parse(csvUserData, { header: true }).data);
    } catch (error) {
      console.error('Error parsing CSV to JSON:', error);
      return; // Exit if parsing fails
    }
  
    // Send JSON data to the API
    this.apiHandler.sendFinalExportJsonData(jsonString).subscribe(
      (response) => {
        console.log('Export successful:', response.message);
      },
      (errorResponse) => {
        console.error('API error:', errorResponse.error.message);
      }
    );
  }
}
