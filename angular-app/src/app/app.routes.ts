import { Routes } from '@angular/router';
import { CblTableComponent } from './cbl-table/cbl-table.component';
import { FirstTableComponent } from './first-table/first-table.component';
import { HomeComponent } from './home/home.component';


export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'first-table', component: FirstTableComponent },
  { path: 'cbl-table', component: CblTableComponent }
];
