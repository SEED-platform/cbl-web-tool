import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
export const authGuard: CanActivateFn = (route, state) => {
  const homeAccess: boolean = JSON.parse(sessionStorage.getItem('HOMEACCESS') || 'true');
  const router = inject(Router);
  if (homeAccess === true) {
    return true;
  } else {
    const currentPage: string = sessionStorage.getItem('CURRENTPAGE') || '';
    router.navigateByUrl(currentPage);
    return false;
  }
};
