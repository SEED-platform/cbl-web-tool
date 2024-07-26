import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import {ColDef} from 'ag-grid-community';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { AgGridAngular } from 'ag-grid-angular';
import "ag-grid-community/styles/ag-grid.css";
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { CustomHeaderComponent } from '../custom-header/custom-header.component';
import { FlaskRequests } from '../service';
import { Router } from '@angular/router';



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

  defaultColDef = {
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
        keys.push('Coordinates');      

    if (this.geoJson.length > 0) {
      this.colDefs = keys.map((key:any) => ({
        field: key,
        headerName: key,
        valueGetter: this.tableDataGetter,
      }));
    }

    sessionStorage.setItem("COL", JSON.stringify(this.colDefs));
  }


   tableDataGetter(){

   }
 

  
 

  
 
  

}
