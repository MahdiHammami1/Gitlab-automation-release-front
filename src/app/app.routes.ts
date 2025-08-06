import { Routes } from '@angular/router';

export const routes: Routes = [
 {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/pages/login/login').then(m => m.LoginComponent)
  },
  {
    path :'auth/callback',
    loadComponent: () => import('./features/auth/pages/login-callback.page').then(m =>m.LoginCallbackPage)
  },
  {
    path :'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then(m =>m.Dashboard)
  }
];
