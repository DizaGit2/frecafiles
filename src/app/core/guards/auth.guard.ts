import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { combineLatest, map, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate() {
    return combineLatest([this.auth.ready$, this.auth.session$]).pipe(
      filter(([ready]) => ready),
      take(1),
      map(([_, session]) => session ? true : this.router.createUrlTree(['/login']))
    );
  }
}