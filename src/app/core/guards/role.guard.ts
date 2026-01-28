import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { combineLatest, filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/profile.model';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot) {
    const roles = (route.data['roles'] || []) as UserRole[];

    return combineLatest([this.auth.ready$, this.auth.profile$]).pipe(
      filter(([ready]) => ready),
      take(1),
      map(([_, profile]) => {
        if (!profile) {
          return this.router.createUrlTree(['/login']);
        }
        if (roles.length === 0 || roles.includes(profile.role)) {
          return true;
        }
        const fallback = profile.role === 'administrator' ? '/admin/clientes' : '/client/archivos';
        return this.router.createUrlTree([fallback]);
      })
    );
  }
}