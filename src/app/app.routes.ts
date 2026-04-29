import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { LoginComponent } from './features/auth/login.component';
import { AdminClientsComponent } from './features/admin/clients/admin-clients.component';
import { AdminFilesComponent } from './features/admin/files/admin-files.component';
import { AdminCategoriesComponent } from './features/admin/categories/admin-categories.component';
import { ClientFilesComponent } from './features/client/files/client-files.component';
import { NotFoundComponent } from './shared/components/not-found/not-found.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  {
    path: 'admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['administrator'] },
    children: [
      { path: 'clientes', component: AdminClientsComponent },
      { path: 'archivos', component: AdminFilesComponent },
      { path: 'categorias', component: AdminCategoriesComponent },
      { path: '', pathMatch: 'full', redirectTo: 'clientes' }
    ]
  },
  {
    path: 'client',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['client'] },
    children: [
      { path: 'archivos', component: ClientFilesComponent },
      { path: '', pathMatch: 'full', redirectTo: 'archivos' }
    ]
  },
  { path: '**', component: NotFoundComponent }
];