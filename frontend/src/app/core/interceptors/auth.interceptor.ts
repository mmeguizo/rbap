import { HttpInterceptorFn } from '@angular/common/http';

// The localStorage key for the access token — must match the key in auth.service.ts
const ACCESS_TOKEN_KEY = 'rbap_access_token';

/**
 * HTTP interceptor that automatically attaches the Bearer token to every outgoing request.
 *
 * How it works:
 *   1. Before any HTTP request leaves the browser, Angular passes it through this function
 *   2. We read the access token from localStorage
 *   3. If a token exists, we clone the request and add the Authorization header
 *   4. The cloned request (with the header) is sent to the backend
 *
 * Why we clone the request:
 *   Angular HTTP requests are immutable — you cannot modify them directly.
 *   You must create a copy (clone) with the new headers.
 *
 * Registered in: app.config.ts → provideHttpClient(withInterceptors([authInterceptor]))
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (!token) {
    // No token in storage — send the request as-is
    // This happens for public endpoints like /auth/google
    return next(req);
  }

  // Clone the request and attach the token as a Bearer header
  const requestWithToken = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Pass the modified request to the next handler (the backend)
  return next(requestWithToken);
};
