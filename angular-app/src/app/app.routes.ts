import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { FirstTableComponent } from './first-table/first-table.component';
import { CblTableComponent } from './cbl-table/cbl-table.component';


export const routes: Routes = [
    { path: '', component: HomeComponent},
    { path: 'first-table', component: FirstTableComponent},
    { path: 'cbl-table', component: CblTableComponent}
];
