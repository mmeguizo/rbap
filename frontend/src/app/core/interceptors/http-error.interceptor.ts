import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Global HTTP error interceptor.
 *
 * Handles:
 *  - 401 Unauthorized → clears local storage and redirects to /login
 *    (happens when the access token has expired or is invalid)
 *
 * All other errors are passed through as-is so each component can handle them.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // Token is expired or invalid — clear stored credentials and send to login
        localStorage.removeItem('rbap_access_token');
        localStorage.removeItem('rbap_refresh_token');
        localStorage.removeItem('rbap_user');
        void router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
