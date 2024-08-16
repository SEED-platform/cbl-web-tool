import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IHeaderAngularComp } from 'ag-grid-angular';
import type { IHeaderParams } from 'ag-grid-community';

export interface MyParams {
  name?: string;
  index?: number;
  api?: any;
}

@Component({
  selector: 'app-custom-header',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './custom-header.component.html',
  styleUrl: './custom-header.component.css'
})
export class CustomHeaderComponent implements IHeaderAngularComp {
  name?: string;
  index?: number;
  api?: any;

  @Output() nameChange = new EventEmitter<{ index: number; name: string }>();

  refresh(params: IHeaderParams): boolean {
    return false;
  }

  agInit(params: IHeaderParams<any, any> & MyParams): void {
    this.name = params.name;
    this.index = params.index;
    this.api = params.api;
  }

  onInputChange() {
    if (this.index !== undefined) {
      const colDefs = JSON.parse(sessionStorage.getItem('COL') || '[]');

      if (colDefs[this.index]) {
        colDefs[this.index].headerName = this.name;
      }

      // Optionally, save the updated columnDefs back to sessionStorage
      sessionStorage.setItem('COL', JSON.stringify(colDefs));
    }
  }
}
