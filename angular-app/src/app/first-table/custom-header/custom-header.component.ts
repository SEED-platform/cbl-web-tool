import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IHeaderAngularComp } from 'ag-grid-angular';
import type { ColDef, IHeaderParams } from 'ag-grid-community';

@Component({
  selector: 'app-custom-header',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './custom-header.component.html',
  styleUrl: './custom-header.component.css'
})
export class CustomHeaderComponent implements IHeaderAngularComp {
  field?: string;
  headerName?: string;

  refresh(_params: IHeaderParams): boolean {
    return false;
  }

  agInit(params: IHeaderParams): void {
    const columnId = params.column.getId();
    this.field = columnId;
    this.headerName = columnId;
  }

  onInputChange(updatedHeaderName: string) {
    const colDefs: ColDef[] = JSON.parse(sessionStorage.getItem('COL') || '[]');

    const col = colDefs.find((colDef) => colDef.field === this.field);
    if (col) {
      col.headerName = updatedHeaderName;
    }

    sessionStorage.setItem('COL', JSON.stringify(colDefs));
  }
}
