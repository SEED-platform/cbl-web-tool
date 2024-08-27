import type { Routes } from '@angular/router';
import { CblTableComponent } from './cbl-table/cbl-table.component';
import { FirstTableComponent } from './first-table/first-table.component';
import { HomeComponent } from './home/home.component';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [authGuard] },
  { path: 'first-table', component: FirstTableComponent},
  { path: 'cbl-table', component: CblTableComponent }
];
