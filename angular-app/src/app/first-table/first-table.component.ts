import { Component, OnInit, ChangeDetectorRef} from '@angular/core';
import {ColDef, GridOptions} from 'ag-grid-community';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { AgGridAngular } from 'ag-grid-angular'
import "ag-grid-community/styles/ag-grid.css";
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { CustomHeaderComponent } from '../custom-header/custom-header.component';
import { FlaskRequests } from '../service';
import { Router } from '@angular/router';
import Papa from 'papaparse';

@Component({
  selector: 'app-first-table',
  standalone: true,
  templateUrl: './first-table.component.html',
  styleUrls: ['./first-table.component.css'],
  imports: [AgGridAngular, FormsModule, CommonModule]
})

export class FirstTableComponent implements OnInit {
   userList: any[] = [];
   colDefs: ColDef[] = []
   ValidatedJsonString: string = '';
   dataValid: boolean = false;
   geoJsonString: string = '';
 
 
  private gridApi: any;
  defaultColDef = {
    flex: 1,
    minWidth: 100,
    sortable: false,
    filter: true,
    editable: true,
    suppressHeaderFilterButton: true,
    headerComponent: CustomHeaderComponent
  };
 

  constructor(private apiHandler: FlaskRequests, private router: Router, private cdr: ChangeDetectorRef) { }
 
  onGridReady(params: any) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
    this.getUser();
  }
 
  ngOnInit(): void {
    this.getUser();
 
  }
 
  getUser() {
    this.userList = JSON.parse(sessionStorage.getItem('FIRSTTABLEDATA') || '[]');
    this.setColumnDefs();
    this.cdr.detectChanges();
    console.log(this.userList)
  }
 
 
  setColumnDefs() {
    if (this.userList.length > 0) {
      const keys = Object.keys(this.userList[0]);
      this.colDefs = keys.map((key, index) => ({
        field: key,
        headerName: key,
        headerComponentParams: {
          name: key,
          index: index ,// Add the index here
          api: this.gridApi 
        }
      }));
    }
    sessionStorage.setItem("COL", JSON.stringify(this.colDefs));
  }
 


  convertAgGridDataToJson(){
    let csvUserData = this.gridApi.getDataAsCsv();
    let jsonHeaderData = JSON.parse(sessionStorage.getItem("COL") || "[]");

    const parsedCsvData = Papa.parse(csvUserData, { header: true }).data;
    const updatedHeaders = jsonHeaderData.map((item:any) => item.headerName);


// Replace CSV headers with JSON headers
    const updatedData = parsedCsvData.map((row: any) => {
    const updatedRow: any = {};
  
    updatedHeaders.forEach((header: string | number, index: number) => {
    updatedRow[header] = row[Object.keys(row)[index]];
    });
    return updatedRow;
    });

   // Generate the new JSON with updated headers
   const newJson = JSON.stringify(updatedData, null, 2);

   // Output or use the new JSON
   return newJson;
  }

  checkData(){
    const finalUserJson = this.convertAgGridDataToJson()
    
    this.apiHandler.checkData(finalUserJson).subscribe(
     (response) => {
       console.log(response.message); // Handle successful response
       this.ValidatedJsonString = response.user_data
       this.dataValid = true
   },
   (errorResponse) => {
       console.log(errorResponse.error.message); // Handle error response
   });
 }


 uploadJsonToServer() {
   this.apiHandler.sendJsonData(this.ValidatedJsonString).subscribe(
     (response) => {
       console.log(response.message); // Handle successful response
       this.geoJsonString= response.user_data
       sessionStorage.setItem('GEOJSONDATA', this.geoJsonString);
       this.router.navigate(['']);
   },
   (errorResponse) => {
       console.error(errorResponse.error.message); // Handle error response
   });
 }
  
}





// import { Component, ViewChild, AfterViewInit, ElementRef, ViewEncapsulation } from '@angular/core';
// import Handsontable from 'handsontable';
// import "handsontable/dist/handsontable.full.css";
// import { FlaskRequests } from '../service';
// import { Router } from '@angular/router';
// import { CommonModule } from '@angular/common';


// @Component({
//   selector: 'app-first-table',
//   standalone: true,
//   imports: [CommonModule],
//   templateUrl: './first-table.component.html',
//   styleUrl: './first-table.component.css',
//   encapsulation: ViewEncapsulation.None
// })
// export class FirstTableComponent implements AfterViewInit {
//   @ViewChild('tableContainer', { static: false }) example2!: ElementRef<HTMLDivElement>;
//   hotInstance!: Handsontable;
//   data: any[] = [];
//   colHeaders: string[] = [];
//   dataArray: any[][] = [[]];
//   jsonString: string = '';
//   jsonData: object[] = [];
//   jsonCheck: boolean = false;



//   constructor(private apiHandler: FlaskRequests, private router: Router){}

//   ngAfterViewInit(): void {
//       let storedUserData = sessionStorage.getItem('FIRSTTABLEDATA');
      
//       if(storedUserData){
//         this.data = JSON.parse(storedUserData);
//       }

//     // Ensure the container is available
//     if (this.example2) {
//       this.dataArray = this.objectArrToArrayArr(this.data);
//       const container = this.example2.nativeElement;
//       this.colHeaders =  Object.keys(this.data[0]);
//       this.hotInstance = new Handsontable(container, {
//         data:  this.dataArray,
//         colHeaders: (index) => this.colHeaders[index],
//         contextMenu: true,
//         width:'100%',
//         height:'auto',
//         manualColumnResize: true,
//         autoWrapRow: true,
//         autoWrapCol: true,
//         licenseKey: 'non-commercial-and-evaluation',
//         allowInsertColumn: true,
//         afterGetColHeader: (col, TH) => {
//           this.attachHeaderEvents(col, TH);
//         },  afterCreateCol: (index, amount) => {
//           this.updateColHeaders(index, amount);
//         },
//         afterRemoveCol: (index, amount) => {
//           this.removeCols(index, amount);
//         }
//       });
//     } else {
//       console.error('Example2 container is not available');
//     }
//   }

//   attachHeaderEvents(col: number, TH: HTMLTableHeaderCellElement): void {
    
//     if (!TH.querySelector('.header-input')) {
//       const input = document.createElement('input');
//       input.className = 'header-input';
      
//       if(this.colHeaders[col] === undefined){
//         input.value = ''
//       }else{
//       input.value = this.colHeaders[col];
//       }
//       if(col === -1){
//         input.readOnly = true; 
//       }
//       input.addEventListener('change', (event) => {
//         const target = event.target as HTMLInputElement;
//         this.colHeaders[col] = target.value;
//         this.hotInstance.updateSettings({
//           colHeaders: (index) => this.colHeaders[index]
//         });
//         console.log(this.colHeaders);
//       });
//       TH.innerHTML = '';
//       TH.appendChild(input);
//     }
//   }

//   updateColHeaders(index: number, amount: number): void {
   
//     for (let i = 0; i < amount; i++) {
//       this.colHeaders.splice(index, 0, "");
//     }
//     console.log("data array", this.dataArray);
//     console.log("col array", this.colHeaders);
//   }

//   removeCols(index: number, amount: number): void {
//     this.colHeaders.splice(index, amount);
//     //this.dataArray.forEach(row =>row.splice(index, amount));
//     console.log("data array", this.dataArray);
//     console.log("col array", this.colHeaders);
//   }



//   getColHeader(index: number): string {
//     if (index >= 0 && index < this.colHeaders.length) {
//       return this.colHeaders[index];
//     }
//     return `Column ${index + 1}`;
//   }


//   objectArrToArrayArr(arrayOfObjects: object[]): any[][]{
//     let arrayOfArrays = [];
//     for(let object of arrayOfObjects){
//          arrayOfArrays.push(Object.values(object));
//     }
//     return arrayOfArrays;
//   }

  
//   arrayArrToObjectArr(arrayOfArrays: any[][], colHeaders: any[]): object[]{
//     let arrayOfObjects = [];
    
//     for (const row of arrayOfArrays) {
//       const obj: any = {};
//       for (let i = 0; i < row.length; i++) {
//         const key = colHeaders[i];
//         if (key !== undefined) {
//           obj[key] = row[i];
//         }
//       }
//       arrayOfObjects.push(obj);
//     }
  
//     return arrayOfObjects;
//   }


  // checkData(){
  //    const userObjectArray = this.arrayArrToObjectArr(this.dataArray, this.colHeaders);
  //    const jsonString = JSON.stringify(userObjectArray)
  //    console.log(jsonString);
  //    this.apiHandler.checkData(jsonString).subscribe(
  //     (response) => {
  //       console.log(response.message); // Handle successful response
  //       this.jsonString = response.user_data
  //       this.jsonCheck = true
  //   },
  //   (errorResponse) => {
  //       console.log(errorResponse.error.message); // Handle error response
  //   });
  // }


  // uploadJsonToServer() {
  //   console.log(this.jsonString)
  //   this.apiHandler.sendJsonData(this.jsonString).subscribe(
  //     (response) => {
  //       console.log(response.message); // Handle successful response
  //       this.jsonString = response.user_data
  //       sessionStorage.setItem('GEOJSONDATA', this.jsonString);
  //       this.router.navigate(['']);
  //   },
  //   (errorResponse) => {
  //       console.error(errorResponse.error.message); // Handle error response
  //   });
  // }
// }

