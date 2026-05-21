import {
  APP_INITIALIZER,
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  provideRouter,
  withHashLocation,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Router with hash-based URLs (e.g. /#/dashboard) and smooth scroll
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
      withViewTransitions(),
      withHashLocation(),
    ),

    // HTTP client with the auth interceptor.
    // The interceptor automatically attaches the Bearer token to every request.
    provideHttpClient(withInterceptors([authInterceptor])),

    provideAnimationsAsync(),

    {
      // APP_INITIALIZER runs before any component renders.
      // We use it to restore the user session from localStorage on page refresh.
      // This means the user stays logged in even after closing and reopening the browser.
      provide: APP_INITIALIZER,
      useFactory: () => {
        const authService = inject(AuthService);
        // Return a function that Angular will await before bootstrapping
        return () => authService.restoreSession();
      },
      multi: true, // multiple APP_INITIALIZER providers can coexist
    },
  ],
};
