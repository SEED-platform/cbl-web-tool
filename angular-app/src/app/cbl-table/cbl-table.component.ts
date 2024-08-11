import { Component, OnInit, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import {ColDef, RowClassRules } from 'ag-grid-community';
import { CommonModule } from '@angular/common'; 
import { AgGridAngular } from 'ag-grid-angular';
import "ag-grid-community/styles/ag-grid.css";
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { FlaskRequests } from '../services/server.service';
import { GeoJsonService } from '../services/geojson.service';
import { Router } from '@angular/router';
import { ValueGetterParams } from "@ag-grid-community/core";
import Papa from 'papaparse';
import { timer, Subscription } from 'rxjs';





@Component({
  selector: 'app-cbl-table',
  standalone: true,
  imports: [AgGridAngular, CommonModule],
  templateUrl: './cbl-table.component.html',
  styleUrl: './cbl-table.component.css',
  encapsulation: ViewEncapsulation.None
})

export class CblTableComponent implements OnInit {
  featuresArray: any[] = [];
  colDefs: ColDef[] = [];
  geoJson: any;
  public duplicateMap: { [key: string]: number } = {};
  private gridApi: any;
  public rowData: any[] = []; 
  private geoJsonSubscription: Subscription | undefined;
  private clickEventSubscription: Subscription | undefined;
  private newBuilingSubscription: Subscription | undefined;
  private modifyBuildingSubscription: Subscription | undefined;
  private isEditing: boolean = false;
  private selectedRowIdStorage: number  | undefined = undefined;


  defaultColDef = {
    flex: 1,
    minWidth: 100,
    sortable: false,
    filter: true,
    editable: true,
    enableCellChangeFlash: true,
  };

  constructor(private apiHandler: FlaskRequests, private router: Router, private cdr: ChangeDetectorRef, private geoJsonService: GeoJsonService) { }
  

  ngOnInit(): void {
    
      this.geoJsonSubscription = this.geoJsonService.getGeoJson().subscribe(data => {
      this.geoJson = data;
      this.findDuplicates(this.geoJson);
      this.updateTable();
    });


    this.clickEventSubscription = this.geoJsonService.clickEvent$.subscribe(clickEvent => {
      if (clickEvent) {
        this.scrollToFeature(clickEvent.latitude, clickEvent.longitude);
      }
    });

    this.newBuilingSubscription = this.geoJsonService.newBulding$.subscribe(newBuilding => {
      if (newBuilding){
         this.gridApi.applyTransaction({ add: [newBuilding], addIndex: 0 });
         this.geoJsonService.insertNewBuildingInGeoJson(newBuilding);
      }
    })

    this.modifyBuildingSubscription = this.geoJsonService.modifyBuilding$.subscribe(modBuilding => {
      if (modBuilding) {
          this.updateModifiedRow(modBuilding);
          setTimeout(()=>{this.geoJsonService.modifyBuildingInGeoJson(modBuilding)}, 300);
    }
  })
}

  ngOnDestroy(): void {
    if (this.geoJsonSubscription) {
      this.geoJsonSubscription.unsubscribe();
    }
    if (this.clickEventSubscription) {
      this.clickEventSubscription.unsubscribe();
    }
  }


  onGridReady(params: any) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  
 
  updateTable() {
   
    if (!this.geoJson || !this.geoJson.features) {
      console.error('Invalid GeoJSON data');
      return;
    }
    
   if(this.geoJson.features.length > 0){
    this.featuresArray = this.geoJson.features;
    this.rowData = this.featuresArray;
   }
   this.setColumnDefs();
   setTimeout(()=>{   this.selectedRowIdStorage = JSON.parse(sessionStorage.getItem("SELECTEDROW") || "undefined")
    if(this.selectedRowIdStorage){
   
      this.scrollToFeatureById(this.selectedRowIdStorage);
    }})

  }



  capitalizeFirstLetter = (string: string) => {
    if (string.length === 0) return string;
    return string.charAt(0).toUpperCase() + string.slice(1);
  };
  

  setColumnDefs() {
     

        let keys:any;
        keys = JSON.parse(sessionStorage.getItem("GEOJSONPROPERTYNAMES")|| '[]');     
        keys.push('coordinates');      

        const nonEditableKeys = ['ubid', 'longitude', 'latitude'];
     
      this.colDefs = keys.map((key:any) => ({
        field: key,
        editable: !nonEditableKeys.includes(key),
        headerName: this.capitalizeFirstLetter(key), 
        valueGetter: (params: ValueGetterParams) => {
          if(this.geoJson.features.length > 0){
          if (key === 'coordinates') {
            return params.data.geometry?.coordinates;
          }
          return params.data.properties[key];
        }
        },   valueSetter: (params: any) => {
          if(this.geoJson.features.length > 0){
          if (key === 'coordinates') {
            params.data.geometry = params.data.geometry || {};
            params.data.geometry.coordinates = params.newValue;
          } else {
            params.data.properties[key] = params.newValue;
          }
        }
        return true;
        }
        // ,
        // cellStyle: (params: any) => {
        //   const field1 = params.data.properties['ubid'];
        //   const field2 = params.data.properties['street_address'];
        //   const uniqueString = `${field1}-${field2}`;
   
        //   const isDuplicate = (this.duplicateMap[uniqueString] || 0) > 1
          
        //   // Apply custom styles based on conditions
        //   if (isDuplicate) {
        //     return {
        //       backgroundColor: 'yellow',
        //     };
        //   }
        //   return {};  // Return an empty object for default styling
        // }
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

  scrollToFeature(latitude: number, longitude: number) {
    const feature = this.rowData.find((f: any) => 
      f.properties.latitude === latitude && f.properties.longitude === longitude
    );
  
    if (feature && this.gridApi) {
      this.gridApi.ensureIndexVisible(this.rowData.indexOf(feature), 'top');
      const index = this.rowData.indexOf(feature);
      const rowNode = this.gridApi.getDisplayedRowAtIndex(index);
      if (rowNode) {
        rowNode.setSelected(true);
      }
    }
  }

  scrollToFeatureById(id: number) {
    // Find the feature in rowData'
     if (!this.gridApi) return;
    this.gridApi!.setGridOption("loading", true);
  
 
    const feature = this.rowData.find((f: any) => f.id === id.toString());


    if (!feature) {
      console.error(`Feature with ID ${id} not found.`);
      return;
    }
  
    if (!this.gridApi) {
      console.error('Grid API is not initialized.');
      return;
    }
  
    if (feature && this.gridApi) {
      this.gridApi.ensureIndexVisible(this.rowData.indexOf(feature), 'top');
      const index = this.rowData.indexOf(feature);

      const rowNode = this.gridApi.getDisplayedRowAtIndex(index);

      if (rowNode) {
        rowNode.setSelected(true);
      }
    }

    timer(200).subscribe(() => {
      this.gridApi!.setGridOption("loading", false);
    });


  }
  

  onRowSelected(event: any) {
      
    if (event.node.isSelected()) {
      const data = event.node.data;
      const id =  data.id;
      this.selectedRowIdStorage = id;
      sessionStorage.setItem("SELECTEDROW", JSON.stringify(this.selectedRowIdStorage));
      const latitude = data.properties.latitude;
      const longitude = data.properties.longitude;
      this.geoJsonService.emitSelectedFeature(latitude, longitude, id);
    }
     
  }

  onCellEditingStarted(event: any) {
    this.isEditing = true;
  }
  
  // Event handler for editing stop
  onCellEditingStopped(event: any) {
    this.isEditing = false;
  }

  handleDelete() {
     if(this.rowData.length !== 0){
      const selectedData = this.gridApi.getSelectedRows();
      
      const res = this.gridApi.applyTransaction({ remove: selectedData })!;
      this.geoJsonService.updateGeoJsonFromMap(res.remove[0].data);

      selectedData.forEach((row: any) => {
        const ubid = row.properties.ubid;
        const streetAddress = row.properties.street_address;
        const uniqueString = `${ubid}-${streetAddress}`;
        
        this.decrementCount(uniqueString);
      });
     }
  }

  updateModifiedRow(modBuilding: any) {
    if(this.rowData.length !== 0){
      const rowNode = this.rowData.find(row => row.id === modBuilding.id.toString());
      
       
     if (rowNode) {
      // Update the row data
      const data = rowNode;

      data.geometry.coordinates = modBuilding.coordinates;
      data.properties.latitude = modBuilding.latitude;
      data.properties.longitude = modBuilding.longitude;
      data.properties.ubid = modBuilding.ubid;

      // Apply the update transaction
      const res = this.gridApi.applyTransaction({
        update: [data] // Use `update` key to modify existing rows
      });

     }
   }
  }

  findDuplicates(geoJson : any){
    geoJson.features.forEach((feature: any) => {
      const ubid = feature.properties.ubid;
      const streetAddress = feature.properties.street_address;
      const uniqueString = `${ubid}-${streetAddress}`;
  
      this.duplicateMap[uniqueString] = (this.duplicateMap[uniqueString] || 0) + 1;
    });
  }

  decrementCount(uniqueString: string) {
    if (this.duplicateMap[uniqueString]) {
      this.duplicateMap[uniqueString]--;
      // Optionally remove the entry if the count reaches zero
      if (this.duplicateMap[uniqueString] <= 0) {
        this.duplicateMap[uniqueString];
      }
    }
  }


}
