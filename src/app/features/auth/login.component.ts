import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { Location } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { combineLatest, filter, take } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SnackbarService } from '../../core/services/snackbar.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatCardModule],
  template: `
    <section class="login-layout">
      <mat-card class="freca-card login-card">
        <div class="login-brand">
          <img src="assets/logo.jpg" alt="FRECA" />
          <div>
            <h1 class="freca-section-title">FRECA Files</h1>
            <p class="freca-muted">Transfer Pricing & Tax Consulting</p>
          </div>
        </div>

        <ng-container *ngIf="inviteMode; else loginForm">
          <div class="invite-copy">
            <p class="freca-muted">Completa la invitacion creando tu contrasena.</p>
          </div>

          <div class="freca-muted" *ngIf="inviteLoading">Validando invitacion...</div>

          <form *ngIf="!inviteLoading" [formGroup]="inviteForm" (ngSubmit)="submitInvite()" class="login-form">
            <mat-form-field appearance="outline">
              <mat-label>Nueva contrasena</mat-label>
              <input matInput formControlName="password" type="password" autocomplete="new-password" />
              <mat-error *ngIf="inviteForm.get('password')?.hasError('minlength')">
                La contrasena debe tener al menos 8 caracteres.
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Confirmar contrasena</mat-label>
              <input matInput formControlName="confirmPassword" type="password" autocomplete="new-password" />
              <mat-error *ngIf="inviteForm.hasError('passwordMismatch')">
                Las contrasenas no coinciden.
              </mat-error>
            </mat-form-field>

            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="inviteForm.invalid || inviteSubmitting">
              {{ inviteSubmitting ? 'Guardando...' : 'Crear cuenta' }}
            </button>
          </form>
        </ng-container>

        <ng-template #loginForm>
          <ng-container *ngIf="!forgotMode; else forgotTpl">
            <form [formGroup]="form" (ngSubmit)="submit()" class="login-form">
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="email" autocomplete="email" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Contrasena</mat-label>
                <input matInput formControlName="password" type="password" autocomplete="current-password" />
              </mat-form-field>

              <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || loading">
                {{ loading ? 'Ingresando...' : 'Ingresar' }}
              </button>

              <button mat-button type="button" class="forgot-link" (click)="enterForgotMode()">
                Olvide mi contrasena
              </button>
            </form>
          </ng-container>

          <ng-template #forgotTpl>
            <div class="invite-copy">
              <p class="freca-muted">Ingresa tu email y te enviaremos un enlace para restablecer tu contrasena.</p>
            </div>
            <form [formGroup]="forgotForm" (ngSubmit)="submitForgot()" class="login-form">
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="email" autocomplete="email" />
              </mat-form-field>

              <button mat-flat-button color="primary" type="submit" [disabled]="forgotForm.invalid || forgotSubmitting">
                {{ forgotSubmitting ? 'Enviando...' : 'Enviar enlace' }}
              </button>

              <button mat-button type="button" class="forgot-link" (click)="forgotMode = false">
                Volver al inicio de sesion
              </button>
            </form>
          </ng-template>
        </ng-template>
      </mat-card>
    </section>
  `,
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loading = false;
  inviteMode = false;
  inviteLoading = false;
  inviteSubmitting = false;
  forgotMode = false;
  forgotSubmitting = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  inviteForm = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: this.matchPasswords }
  );

  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snackbar: SnackbarService,
    private location: Location
  ) {}

  ngOnInit(): void {
    const inviteParams = this.getInviteParams();
    if (inviteParams) {
      this.inviteMode = true;
      this.handleInviteParams(inviteParams);
    }

    combineLatest([this.auth.ready$, this.auth.profile$])
      .pipe(
        filter(([ready, profile]) => ready && !!profile && !this.inviteMode),
        take(1)
      )
      .subscribe(async ([_, profile]) => {
        const route = profile?.role === 'administrator' ? '/admin/clientes' : '/client/archivos';
        await this.router.navigate([route]);
      });
  }

  private getInviteParams(): URLSearchParams | null {
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
    const hasInviteToken =
      combined.get('type') === 'invite' ||
      combined.has('access_token') ||
      combined.has('refresh_token') ||
      combined.has('code');
    return hasInviteToken ? combined : null;
  }

  private async handleInviteParams(params: URLSearchParams): Promise<void> {
    this.inviteLoading = true;
    try {
      const code = params.get('code');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (code) {
        await this.auth.exchangeCodeForSession(code);
      } else if (accessToken && refreshToken) {
        await this.auth.setSession(accessToken, refreshToken);
      } else {
        throw new Error('Invitacion invalida o expirada.');
      }
    } catch (error: any) {
      this.inviteMode = false;
      this.snackbar.error(error?.message || 'No se pudo validar la invitacion.');
    } finally {
      window.history.replaceState({}, document.title, window.location.pathname);
      this.inviteLoading = false;
    }
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
    this.loading = true;
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.signIn(email!, password!);
      const route = await this.auth.getHomeRoute();
      await this.router.navigate([route]);
    } catch (error: any) {
      this.snackbar.error(error?.message || 'No se pudo iniciar sesion.');
    } finally {
      this.loading = false;
    }
  }

  enterForgotMode(): void {
    const email = this.form.get('email')?.value;
    if (email) {
      this.forgotForm.patchValue({ email });
    }
    this.forgotMode = true;
  }

  async submitForgot(): Promise<void> {
    if (this.forgotForm.invalid) {
      return;
    }
    this.forgotSubmitting = true;
    try {
      const { email } = this.forgotForm.getRawValue();
      const redirectTo = `${window.location.origin}${this.location.prepareExternalUrl('/reset-password')}`;
      await this.auth.resetPasswordForEmail(email!, redirectTo);
      this.snackbar.success('Enlace enviado. Revisa tu correo.');
      this.forgotMode = false;
    } catch (error: any) {
      this.snackbar.error(error?.message || 'No se pudo enviar el enlace.');
    } finally {
      this.forgotSubmitting = false;
    }
  }

  async submitInvite(): Promise<void> {
    if (this.inviteForm.invalid) {
      return;
    }
    this.inviteSubmitting = true;
    try {
      const { password } = this.inviteForm.getRawValue();
      await this.auth.updatePassword(password!);
      const route = await this.auth.getHomeRoute();
      this.snackbar.success('Cuenta activada correctamente.');
      await this.router.navigate([route]);
    } catch (error: any) {
      this.snackbar.error(error?.message || 'No se pudo actualizar la contrasena.');
    } finally {
      this.inviteSubmitting = false;
    }
  }
}
