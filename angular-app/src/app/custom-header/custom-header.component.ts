import { Component,EventEmitter, Output } from '@angular/core';
import { ICellEditorAngularComp, ICellRendererAngularComp, IHeaderAngularComp } from 'ag-grid-angular';
import { ICellEditorParams, ICellRendererParams , IHeaderParams} from 'ag-grid-community';
import { FormsModule } from '@angular/forms';


export interface MyParams{
  name?:string
  index?:number
  api?:any
}
@Component({
  selector: 'app-custom-header',
  standalone: true,
  imports: [FormsModule],
  template: `
  <header>
  <input [(ngModel)]="name"   (ngModelChange)="onInputChange()">
   </header>
  `,
  styles: `
    header {
      border: none;
      padding: 10px;
      width: 100%;  /* Ensure the header takes full width of its container */
      height: 100%; /* Ensure the header takes full height of its container */
      box-sizing: border-box;
    }
    input {
      width: 100%;  /* Input will take full width of its parent header */
      height: 100%; /* Input will take full height of its parent header */
      border: none;
      padding: 5px;
      box-sizing: border-box; 
      background: transparent;
    }
  `
})
export class CustomHeaderComponent implements IHeaderAngularComp {
   
   name?: string;
   index?: number;
   api?: any;


   @Output() nameChange = new EventEmitter<{ index: number; name: string }>();

   constructor(){}
   refresh(params: IHeaderParams): boolean {
     return false;
   }

   agInit(params: IHeaderParams<any, any> & MyParams): void {
     this.name = params.name;
     this.index = params.index;
     this.api = params.api;
     
   }
   ngOnInit(): void {

   }

   onInputChange() {
 
      if (this.index !== undefined) {
        let colDefs = JSON.parse(sessionStorage.getItem("COL") || '[]');
        console.log(colDefs);
    
        if (colDefs[this.index]) {
          colDefs[this.index].headerName = this.name;
          console.log(colDefs);
        }
    
         
        // Optionally, save the updated columnDefs back to sessionStorage
        sessionStorage.setItem("COL", JSON.stringify(colDefs));
      }
  
  }
   
}
