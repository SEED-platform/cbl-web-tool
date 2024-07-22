import { Component, ViewChild, AfterViewInit, ElementRef, ViewEncapsulation } from '@angular/core';
import Handsontable from 'handsontable';
import "handsontable/dist/handsontable.full.css";
import { FlaskRequests } from '../service';

@Component({
  selector: 'app-first-table',
  standalone: true,
  imports: [],
  templateUrl: './first-table.component.html',
  styleUrl: './first-table.component.css',
  encapsulation: ViewEncapsulation.None
})
export class FirstTableComponent implements AfterViewInit {
  @ViewChild('tableContainer', { static: false }) example2!: ElementRef<HTMLDivElement>;
  hotInstance!: Handsontable;

  
  data: any[] = [];
  colHeaders: string[] = [];
  dataArray: any[][] = [[]];



  constructor(private apiHandler: FlaskRequests){}

  ngAfterViewInit(): void {
      let storedUserData = sessionStorage.getItem('FIRSTTABLEDATA');
      
      if(storedUserData){
        this.data = JSON.parse(storedUserData);
      }

    // Ensure the container is available
    if (this.example2) {
      this.dataArray = this.objectArrToArrayArr(this.data);
      const container = this.example2.nativeElement;
      this.colHeaders =  Object.keys(this.data[0]);
      this.hotInstance = new Handsontable(container, {
        data:  this.dataArray,
        colHeaders: (index) => this.colHeaders[index],
        contextMenu: true,
        width:'100%',
        height:'auto',
        manualColumnResize: true,
        autoWrapRow: true,
        autoWrapCol: true,
        licenseKey: 'non-commercial-and-evaluation',
        allowInsertColumn: true,
        afterGetColHeader: (col, TH) => {
          this.attachHeaderEvents(col, TH);
        },  afterCreateCol: (index, amount) => {
          this.updateColHeaders(index, amount);
        },
        afterRemoveCol: (index, amount) => {
          this.removeCols(index, amount);
        }
      });
    } else {
      console.error('Example2 container is not available');
    }
  }

  attachHeaderEvents(col: number, TH: HTMLTableHeaderCellElement): void {
    
    if (!TH.querySelector('.header-input')) {
      const input = document.createElement('input');
      input.className = 'header-input';
      
      if(this.colHeaders[col] === undefined){
        input.value = ''
      }else{
      input.value = this.colHeaders[col];
      }
      if(col === -1){
        input.readOnly = true; 
      }
      input.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        this.colHeaders[col] = target.value;
        this.hotInstance.updateSettings({
          colHeaders: (index) => this.colHeaders[index]
        });
        console.log(this.colHeaders);
      });
      TH.innerHTML = '';
      TH.appendChild(input);
    }
  }

  updateColHeaders(index: number, amount: number): void {
   
    for (let i = 0; i < amount; i++) {
      this.colHeaders.splice(index, 0, "");
    }
    console.log("data array", this.dataArray);
    console.log("col array", this.colHeaders);
  }

  removeCols(index: number, amount: number): void {
    this.colHeaders.splice(index, amount);
    //this.dataArray.forEach(row =>row.splice(index, amount));
    console.log("data array", this.dataArray);
    console.log("col array", this.colHeaders);
  }



  getColHeader(index: number): string {
    if (index >= 0 && index < this.colHeaders.length) {
      return this.colHeaders[index];
    }
    return `Column ${index + 1}`;
  }


  objectArrToArrayArr(arrayOfObjects: object[]): any[][]{
    let arrayOfArrays = [];
    for(let object of arrayOfObjects){
         arrayOfArrays.push(Object.values(object));
    }
    return arrayOfArrays;
  }

  
  arrayArrToObjectArr(arrayOfArrays: any[][], colHeaders: any[]): object[]{
    let arrayOfObjects = [];
    
    for (const row of arrayOfArrays) {
      const obj: any = {};
      for (let i = 0; i < row.length; i++) {
        const key = colHeaders[i];
        if (key !== undefined) {
          obj[key] = row[i];
        }
      }
      arrayOfObjects.push(obj);
    }
  
    return arrayOfObjects;
  }


  checkData(){
     const userObjectArray = this.arrayArrToObjectArr(this.dataArray, this.colHeaders);
     const jsonString = JSON.stringify(userObjectArray)
     console.log(jsonString);
     this.apiHandler.checkData(jsonString).subscribe(
      (response) => {
        console.log(response.message); // Handle successful response
    },
    (errorResponse) => {
        console.log(errorResponse.error.message); // Handle error response
    });
  }
}

