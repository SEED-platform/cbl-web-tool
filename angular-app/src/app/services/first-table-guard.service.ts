import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class FirstTableGuardService implements CanActivate {

 
  constructor(private router: Router) {
    this.initializeState();
  }
   
  canActivate(): boolean {
    return this.getLoadedState();
  }

  deactivate() {
    this.setLoadedState(false);
  }

  getLoadedState(): boolean {
    const state = sessionStorage.getItem('firstTableLoaded');
    return state === 'true';
  }

  setLoadedState(loaded: boolean) {
    sessionStorage.setItem('firstTableLoaded', String(loaded));
  }


}
