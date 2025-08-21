import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashobard',
    pathMatch: 'full'
  },
  {
    path: 'release-history',
    loadComponent: () => import('./features/release-history/release-history').then(m => m.ReleaseHistoryComponent)
  },
  {
    path: 'release-details/:id',
    loadComponent: () => import('./features/release-details/release-details').then(m => m.ReleaseDetailsComponent)
  },
  {
    path: '',
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard)
  },
  {
    path: 'projects/:id',
    loadComponent: () => import('./features/project-details/project-details').then(m => m.ProjectDetails)
  },
  {
    path: 'projects/:id/modules',
    loadComponent: () => import('./features/project-modules/project-modules').then(m => m.ProjectModules)
  },
  {
    path: 'create-release',
    loadComponent: () => import('./features/create-release/create-release').then(m => m.CreateReleaseComponent)
  }
];
