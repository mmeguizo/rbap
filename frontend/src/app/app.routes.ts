import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminRoleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    // Default redirect: opening the app goes to /login
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    // Login page — public, no guard
    path: 'login',
    loadComponent: () =>
      import('./views/login/login.component').then((module) => module.LoginComponent),
    data: {
      title: 'Login to RBAP',
    },
  },
  {
    // Register page — public, no guard
    path: 'register',
    loadComponent: () =>
      import('./views/register/register.component').then((module) => module.RegisterComponent),
    data: {
      title: 'Create an Account',
    },
  },
  {
    // Auth callback — landing page after Google OAuth.
    // Public: the user arrives here with tokens from the backend redirect.
    // After processing the tokens, it navigates to /dashboard.
    path: 'auth/callback',
    loadComponent: () =>
      import('./views/auth-callback/auth-callback.component').then(
        (module) => module.AuthCallbackComponent,
      ),
  },
  {
    // Shell layout (sidebar + header) — protected by authGuard.
    // Only logged-in users can access any child route inside this.
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/default-layout/default-layout.component').then(
        (module) => module.DefaultLayoutComponent,
      ),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./views/dashboard/dashboard.component').then(
            (module) => module.DashboardComponent,
          ),
        data: {
          title: 'Dashboard',
        },
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./views/profile/profile.component').then((module) => module.ProfileComponent),
        data: {
          title: 'Profile',
        },
      },
      {
        path: 'admin/users',
        canActivate: [adminRoleGuard],
        loadComponent: () =>
          import('./views/admin/users/users.component').then((module) => module.UsersComponent),
        data: {
          title: 'User Management',
        },
      },
    ],
  },
  {
    // Catch-all: any unknown URL goes to login
    path: '**',
    redirectTo: 'login',
  },
];
