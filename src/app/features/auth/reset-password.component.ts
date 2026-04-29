import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/services/auth.service';
import { SnackbarService } from '../../core/services/snackbar.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="login-layout">
      <aside class="login-editorial">
        <p class="login-editorial__eyebrow">Recuperacion</p>
        <h1 class="login-editorial__title freca-section-title">FRECA Files</h1>
        <p class="login-editorial__lede">Restablecer contrasena</p>
        <p class="login-editorial__pullquote">
          Tu acceso permanece privado. Define una nueva contrasena para continuar.
        </p>
        <div class="login-editorial__rule" aria-hidden="true"></div>
        <p class="login-editorial__meta">FRECA &middot; Estudio Privado &middot; Mexico</p>
      </aside>

      <article class="login-card freca-card">
        <header class="login-form__header">
          <p class="login-form__eyebrow">Nueva contrasena</p>
          <h2 class="login-form__title">Actualiza tu acceso</h2>
        </header>

        <p class="login-form__loading" *ngIf="loading">Validando enlace...</p>

        <p class="login-form__lede" *ngIf="!loading && tokenValid">
          Ingresa tu nueva contrasena para continuar.
        </p>

        <form
          *ngIf="!loading && tokenValid"
          [formGroup]="form"
          (ngSubmit)="submit()"
          class="login-form">
          <mat-form-field appearance="outline">
            <mat-label>Nueva contrasena</mat-label>
            <input matInput formControlName="password" type="password" autocomplete="new-password" />
            <mat-error *ngIf="form.get('password')?.hasError('minlength')">
              La contrasena debe tener al menos 8 caracteres.
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Confirmar contrasena</mat-label>
            <input matInput formControlName="confirmPassword" type="password" autocomplete="new-password" />
            <mat-error *ngIf="form.hasError('passwordMismatch')">
              Las contrasenas no coinciden.
            </mat-error>
          </mat-form-field>

          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || submitting">
            {{ submitting ? 'Guardando...' : 'Actualizar contrasena' }}
          </button>
        </form>
      </article>
    </section>
  `,
  styleUrls: ['./login.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  loading = true;
  submitting = false;
  tokenValid = false;

  form = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: this.matchPasswords }
  );

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snackbar: SnackbarService
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const params = this.parseAuthParams();
      const code = params.get('code');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (code) {
        await this.auth.exchangeCodeForSession(code);
      } else if (accessToken && refreshToken) {
        await this.auth.setSession(accessToken, refreshToken);
      } else {
        throw new Error('Enlace de recuperacion invalido o expirado.');
      }
      this.tokenValid = true;
    } catch (error: any) {
      this.snackbar.error(error?.message || 'No se pudo validar el enlace.');
      await this.router.navigate(['/login']);
    } finally {
      window.history.replaceState({}, document.title, window.location.pathname);
      this.loading = false;
    }
  }

  private parseAuthParams(): URLSearchParams {
    const url = new URL(window.location.href);
    const combined = new URLSearchParams(url.search);
    if (url.hash) {
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      hashParams.forEach((value, key) => {
        if (!combined.has(key)) {
          combined.set(key, value);
        }
      });
    }
    return combined;
  }

  private matchPasswords(control: AbstractControl) {
    const password = control.get('password')?.value;
    const confirm = control.get('confirmPassword')?.value;
    return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.submitting = true;
    try {
      const { password } = this.form.getRawValue();
      await this.auth.updatePassword(password!);
      const route = await this.auth.getHomeRoute();
      this.snackbar.success('Contrasena actualizada correctamente.');
      await this.router.navigate([route]);
    } catch (error: any) {
      this.snackbar.error(error?.message || 'No se pudo actualizar la contrasena.');
    } finally {
      this.submitting = false;
    }
  }
}
