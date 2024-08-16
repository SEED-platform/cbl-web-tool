import type { ValueGetterParams } from '@ag-grid-community/core';
import { CommonModule } from '@angular/common';
import type { OnDestroy, OnInit } from '@angular/core';
import { ChangeDetectorRef, Component, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef } from 'ag-grid-community';
import Papa from 'papaparse';
import type { Subscription } from 'rxjs';
import { GeoJsonService } from '../services/geojson.service';
import { FlaskRequests } from '../services/server.service';

@Component({
  selector: 'app-cbl-table',
  standalone: true,
  imports: [AgGridAngular, CommonModule],
  templateUrl: './cbl-table.component.html',
  styleUrl: './cbl-table.component.css',
  encapsulation: ViewEncapsulation.None
})
export class CblTableComponent implements OnInit, OnDestroy {
  featuresArray: any[] = [];
  colDefs: ColDef[] = [];
  geoJson: any;
  public duplicateMap: Record<string, number> = {};
  public rowData: any[] = [];
  //ag grid set up
  defaultColDef = {
    flex: 1,
    minWidth: 100,
    sortable: false,
    filter: true,
    editable: true,
    enableCellChangeFlash: true
  };
  private gridApi: any;
  private geoJsonSubscription?: Subscription;
  private clickEventSubscription?: Subscription;
  private newBuilingSubscription?: Subscription;
  private modifyBuildingSubscription?: Subscription;
  private isEditing = false;
  private selectedRowIdStorage?: string;
  private initialLoad = true; // Flag to track initial load

  constructor(
    private apiHandler: FlaskRequests,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private geoJsonService: GeoJsonService
  ) {}

  ngOnInit() {
    this.geoJsonSubscription = this.geoJsonService.getGeoJson().subscribe((data) => {
      this.geoJson = data;
      if (this.initialLoad) {
        //keeps it from rendering every change..better performance
        this.updateTable(); // Update table only on initial load
        this.initialLoad = false; // Set the flag to false after the initial load
      }
    });

    //if a building is clicked it will scroll to that index on table
    this.clickEventSubscription = this.geoJsonService.clickEvent$.subscribe((clickEvent) => {
      if (clickEvent) {
        if (clickEvent.id !== '') {
          this.selectedRowIdStorage = clickEvent.id;
          this.scrollToFeatureById(this.selectedRowIdStorage);
          console.log('THIS IS SELECTED ROW ID', this, this.selectedRowIdStorage); //keep selected row incase the table re renders and you want to go back to it
          sessionStorage.setItem('SELECTEDROW', JSON.stringify(this.selectedRowIdStorage));
        }
      }
    });

    //inserts new building in table and geojson
    this.newBuilingSubscription = this.geoJsonService.newBuilding$.subscribe((newBuilding) => {
      if (newBuilding) {
        this.gridApi.applyTransaction({ add: [newBuilding], addIndex: 0 });
        this.geoJsonService.insertNewBuildingInGeoJson(newBuilding); //updates the original geojson
        setTimeout(() => {
          this.updateTable(), 10;
        }); //needed to keep in sync with map
      }
    });

    //just modies the existing row...... does not need rerender
    this.modifyBuildingSubscription = this.geoJsonService.modifyBuilding$.subscribe((modBuilding) => {
      if (modBuilding) {
        this.updateModifiedRow(modBuilding);
        setTimeout(() => {
          this.geoJsonService.modifyBuildingInGeoJson(modBuilding);
        }, 300);
      }
    });
  }

  ngOnDestroy() {
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

  //sets up the grid....also use when need to re-sync data
  updateTable() {
    if (!this.geoJson || !this.geoJson.features) {
      console.error('Invalid GeoJSON data');
      return;
    }

    if (this.geoJson.features.length > 0) {
      this.featuresArray = this.geoJson.features;
      this.rowData = this.featuresArray;
    }
    this.setColumnDefs();

    if (this.gridApi) {
      setTimeout(() => {
        this.gridApi.deselectAll();
        this.scrollToTop();
      }, 100);
    }
  }

  capitalizeFirstLetter = (string: string) => {
    if (string.length === 0) return string;
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  //dynamically sets grid for geojson values
  setColumnDefs() {
    const keys = JSON.parse(sessionStorage.getItem('GEOJSONPROPERTYNAMES') || '[]');
    keys.push('coordinates');

    const nonEditableKeys = ['ubid', 'longitude', 'latitude'];

    this.colDefs = keys.map((key: any) => ({
      field: key,
      editable: !nonEditableKeys.includes(key),
      headerName: this.capitalizeFirstLetter(key),
      valueGetter: (params: ValueGetterParams) => {
        if (this.geoJson.features.length > 0) {
          if (key === 'coordinates') {
            return params.data.geometry?.coordinates;
          }
          return params.data.properties[key];
        }
      },
      valueSetter: (params: any) => {
        if (this.geoJson.features.length > 0) {
          if (key === 'coordinates') {
            params.data.geometry = params.data.geometry || {};
            params.data.geometry.coordinates = params.newValue;
          } else {
            params.data.properties[key] = params.newValue;
          }
        }
        return true;
      }
    }));
    sessionStorage.setItem('COL', JSON.stringify(this.colDefs));
  }

  exportAsJson() {
    // Stop editing changes data without clicking off cell
    this.gridApi.stopEditing();

    // Get the data as CSV
    const csvUserData = this.gridApi.getDataAsCsv();

    // Convert CSV to JSON using PapaParse
    let jsonString: string;
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
    if (longitude === -1 && latitude === -1) {
      this.scrollToTop();
      this.gridApi.deselectAll();
      return;
    }

    const feature = this.rowData.find((f: any) => f.properties.latitude === latitude && f.properties.longitude === longitude);

    if (feature && this.gridApi) {
      this.gridApi.ensureIndexVisible(this.rowData.indexOf(feature), 'middle');
      const index = this.rowData.indexOf(feature);
      const rowNode = this.gridApi.getDisplayedRowAtIndex(index);
      if (rowNode) {
        rowNode.setSelected(true);
      }
    }
  }

  scrollToTop() {
    this.gridApi.ensureIndexVisible(0, 'top');
    const rowNode1 = this.gridApi!.getDisplayedRowAtIndex(0)!;
    this.gridApi!.flashCells({ rowNodes: [rowNode1] });
  }

  scrollToFeatureById(id: string) {
    // Find the feature in rowData'

    const feature = this.rowData.find((f: any) => f.id === id);

    if (!feature) {
      console.error(`Feature with ID ${id} not found.`);
      return;
    }

    console.log('THIS IS THE FEATURE BEING SEARCHED', feature);
    console.log(this.rowData.indexOf(feature));

    if (feature && this.gridApi) {
      this.gridApi.ensureIndexVisible(this.rowData.indexOf(feature), 'middle');
      const index = this.rowData.indexOf(feature);
      const rowNode = this.gridApi.getDisplayedRowAtIndex(index);

      if (rowNode) {
        rowNode.setSelected(true);
      }
    }
  }

  onRowClicked(event: any) {
    this.geoJsonService.setIsDataSentFromTable(false);
    this.onRowSelected(event);
  }

  onRowSelected(event: any) {
    if (event.node.isSelected()) {
      const data = event.node.data;
      console.log('RICKY WHEN I CATCH YOU RICKY', data);
      const id = data.id;
      console.log('this is selected in row', id);
      this.selectedRowIdStorage = id;
      sessionStorage.setItem('SELECTEDROW', JSON.stringify(this.selectedRowIdStorage));
      const latitude = data.properties.latitude;
      const longitude = data.properties.longitude;
      const quality = data.properties.quality;
      if (!this.geoJsonService.isDataSentFromTable()) {
        this.geoJsonService.emitSelectedFeature(latitude, longitude, id, quality);
      }
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
    if (this.rowData.length !== 0) {
      const selectedData = this.gridApi.getSelectedRows();

      const res = this.gridApi.applyTransaction({ remove: selectedData })!;

      console.log('THIS IS BEING SENT FROM THE MAP TO TABLE', res.remove[0].data);
      this.geoJsonService.removeEntirePolygonRefInMap(res.remove[0].data.id);
      this.updateTable();
    }
  }

  updateModifiedRow(modBuilding: any) {
    if (this.rowData.length !== 0) {
      const rowNode = this.rowData.find((row) => row.id === modBuilding.id.toString());

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

  findDuplicates(geoJson: any) {
    geoJson.features.forEach((feature: any) => {
      const ubid = feature.properties.ubid;
      const streetAddress = feature.properties.street_address;
      const uniqueString = `${ubid}-${streetAddress}`;

      this.duplicateMap[uniqueString] = (this.duplicateMap[uniqueString] || 0) + 1;
    });
  }
}
