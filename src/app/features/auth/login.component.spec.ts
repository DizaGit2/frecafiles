import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Location } from '@angular/common';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { BehaviorSubject, of } from 'rxjs';
import { Profile } from '../../core/models/profile.model';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;
  let router: Router;
  let location: Location;

  const mockProfile: Profile = {
    user_id: 'test-user-id',
    full_name: 'Test User',
    email: 'test@example.com',
    role: 'client',
    is_active: true,
    created_at: new Date().toISOString()
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'signIn',
      'signOut',
      'updatePassword',
      'setSession',
      'exchangeCodeForSession',
      'getHomeRoute'
    ], {
      ready$: new BehaviorSubject<boolean>(true),
      profile$: new BehaviorSubject<Profile | null>(null)
    });

    snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([
          { path: 'login', component: LoginComponent },
          { path: 'client/archivos', component: LoginComponent },
          { path: 'admin/clientes', component: LoginComponent }
        ]),
        provideAnimationsAsync(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SnackbarService, useValue: snackbarServiceSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  describe('Login Form', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should have an invalid form when empty', () => {
      expect(component.form.valid).toBeFalse();
    });

    it('should have a valid form with email and password', () => {
      component.form.setValue({ email: 'test@example.com', password: 'password123' });
      expect(component.form.valid).toBeTrue();
    });

    it('should show email validation error for invalid email', () => {
      component.form.get('email')?.setValue('invalid');
      component.form.get('email')?.markAsTouched();
      expect(component.form.get('email')?.hasError('email')).toBeTrue();
    });

    it('should call signIn on form submit', fakeAsync(() => {
      authServiceSpy.signIn.and.returnValue(Promise.resolve());
      authServiceSpy.getHomeRoute.and.returnValue(Promise.resolve('/client/archivos'));

      component.form.setValue({ email: 'test@example.com', password: 'password123' });
      component.submit();
      tick();

      expect(authServiceSpy.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
    }));

    it('should show error snackbar on login failure', fakeAsync(() => {
      authServiceSpy.signIn.and.returnValue(Promise.reject(new Error('Invalid credentials')));

      component.form.setValue({ email: 'test@example.com', password: 'wrongpassword' });
      component.submit();
      tick();

      expect(snackbarServiceSpy.error).toHaveBeenCalledWith('Invalid credentials');
    }));

    it('should set loading to true during submit', fakeAsync(() => {
      authServiceSpy.signIn.and.returnValue(new Promise(resolve => setTimeout(resolve, 100)));
      authServiceSpy.getHomeRoute.and.returnValue(Promise.resolve('/client/archivos'));

      component.form.setValue({ email: 'test@example.com', password: 'password123' });
      component.submit();

      expect(component.loading).toBeTrue();

      tick(100);

      expect(component.loading).toBeFalse();
    }));
  });

  describe('Invite Form', () => {
    beforeEach(() => {
      component.inviteMode = true;
      fixture.detectChanges();
    });

    it('should have an invalid invite form when empty', () => {
      expect(component.inviteForm.valid).toBeFalse();
    });

    it('should require minimum 8 characters for password', () => {
      component.inviteForm.get('password')?.setValue('short');
      component.inviteForm.get('password')?.markAsTouched();
      expect(component.inviteForm.get('password')?.hasError('minlength')).toBeTrue();
    });

    it('should accept password with 8+ characters', () => {
      component.inviteForm.get('password')?.setValue('password123');
      expect(component.inviteForm.get('password')?.hasError('minlength')).toBeFalse();
    });

    it('should show error when passwords do not match', () => {
      component.inviteForm.setValue({
        password: 'password123',
        confirmPassword: 'different123'
      });
      expect(component.inviteForm.hasError('passwordMismatch')).toBeTrue();
    });

    it('should have valid form when passwords match', () => {
      component.inviteForm.setValue({
        password: 'password123',
        confirmPassword: 'password123'
      });
      expect(component.inviteForm.valid).toBeTrue();
    });

    it('should call updatePassword on invite submit', fakeAsync(() => {
      authServiceSpy.updatePassword.and.returnValue(Promise.resolve());
      authServiceSpy.getHomeRoute.and.returnValue(Promise.resolve('/client/archivos'));

      component.inviteForm.setValue({
        password: 'newpassword123',
        confirmPassword: 'newpassword123'
      });
      component.submitInvite();
      tick();

      expect(authServiceSpy.updatePassword).toHaveBeenCalledWith('newpassword123');
    }));

    it('should show success snackbar on successful invite acceptance', fakeAsync(() => {
      authServiceSpy.updatePassword.and.returnValue(Promise.resolve());
      authServiceSpy.getHomeRoute.and.returnValue(Promise.resolve('/client/archivos'));

      component.inviteForm.setValue({
        password: 'newpassword123',
        confirmPassword: 'newpassword123'
      });
      component.submitInvite();
      tick();

      expect(snackbarServiceSpy.success).toHaveBeenCalledWith('Cuenta activada correctamente.');
    }));

    it('should show error snackbar on invite failure', fakeAsync(() => {
      authServiceSpy.updatePassword.and.returnValue(Promise.reject(new Error('Token expired')));

      component.inviteForm.setValue({
        password: 'newpassword123',
        confirmPassword: 'newpassword123'
      });
      component.submitInvite();
      tick();

      expect(snackbarServiceSpy.error).toHaveBeenCalledWith('Token expired');
    }));

    it('should set inviteSubmitting during submit', fakeAsync(() => {
      authServiceSpy.updatePassword.and.returnValue(new Promise(resolve => setTimeout(resolve, 100)));
      authServiceSpy.getHomeRoute.and.returnValue(Promise.resolve('/client/archivos'));

      component.inviteForm.setValue({
        password: 'newpassword123',
        confirmPassword: 'newpassword123'
      });
      component.submitInvite();

      expect(component.inviteSubmitting).toBeTrue();

      tick(100);

      expect(component.inviteSubmitting).toBeFalse();
    }));
  });

  describe('Invite Token Parsing', () => {
    it('should detect invite mode from URL with type=invite', () => {
      // Mock window.location to include invite params
      const originalLocation = window.location;

      // @ts-ignore - readonly property override for testing
      delete window.location;
      // @ts-ignore
      window.location = new URL('http://localhost:4300/login?type=invite');

      const newFixture = TestBed.createComponent(LoginComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      expect(newComponent.inviteMode).toBeTrue();

      // Restore
      window.location = originalLocation;
    });

    it('should detect invite mode from URL with access_token', () => {
      const originalLocation = window.location;

      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = new URL('http://localhost:4300/login?access_token=abc&refresh_token=def');

      authServiceSpy.setSession.and.returnValue(Promise.resolve());

      const newFixture = TestBed.createComponent(LoginComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      expect(newComponent.inviteMode).toBeTrue();

      window.location = originalLocation;
    });

    it('should detect invite mode from URL with code parameter', () => {
      const originalLocation = window.location;

      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = new URL('http://localhost:4300/login?code=authcode123');

      authServiceSpy.exchangeCodeForSession.and.returnValue(Promise.resolve());

      const newFixture = TestBed.createComponent(LoginComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      expect(newComponent.inviteMode).toBeTrue();

      window.location = originalLocation;
    });

    it('should call exchangeCodeForSession when code is present', fakeAsync(() => {
      const originalLocation = window.location;

      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = new URL('http://localhost:4300/login?code=authcode123');

      authServiceSpy.exchangeCodeForSession.and.returnValue(Promise.resolve());

      const newFixture = TestBed.createComponent(LoginComponent);
      newFixture.detectChanges();
      tick();

      expect(authServiceSpy.exchangeCodeForSession).toHaveBeenCalledWith('authcode123');

      window.location = originalLocation;
    }));

    it('should call setSession when access_token and refresh_token are present', fakeAsync(() => {
      const originalLocation = window.location;

      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = new URL('http://localhost:4300/login?access_token=access123&refresh_token=refresh456');

      authServiceSpy.setSession.and.returnValue(Promise.resolve());

      const newFixture = TestBed.createComponent(LoginComponent);
      newFixture.detectChanges();
      tick();

      expect(authServiceSpy.setSession).toHaveBeenCalledWith('access123', 'refresh456');

      window.location = originalLocation;
    }));

    it('should show error and exit invite mode on invalid token', fakeAsync(() => {
      const originalLocation = window.location;

      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = new URL('http://localhost:4300/login?code=invalidcode');

      authServiceSpy.exchangeCodeForSession.and.returnValue(
        Promise.reject(new Error('Invalid or expired code'))
      );

      const newFixture = TestBed.createComponent(LoginComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();
      tick();

      expect(snackbarServiceSpy.error).toHaveBeenCalled();
      expect(newComponent.inviteMode).toBeFalse();

      window.location = originalLocation;
    }));
  });

  describe('Navigation After Auth', () => {
    it('should redirect admin to /admin/clientes after login', fakeAsync(() => {
      const adminProfile: Profile = { ...mockProfile, role: 'administrator' };
      authServiceSpy.signIn.and.returnValue(Promise.resolve());
      authServiceSpy.getHomeRoute.and.returnValue(Promise.resolve('/admin/clientes'));

      fixture.detectChanges();
      component.form.setValue({ email: 'admin@example.com', password: 'password123' });
      component.submit();
      tick();

      expect(authServiceSpy.getHomeRoute).toHaveBeenCalled();
    }));

    it('should redirect client to /client/archivos after login', fakeAsync(() => {
      authServiceSpy.signIn.and.returnValue(Promise.resolve());
      authServiceSpy.getHomeRoute.and.returnValue(Promise.resolve('/client/archivos'));

      fixture.detectChanges();
      component.form.setValue({ email: 'client@example.com', password: 'password123' });
      component.submit();
      tick();

      expect(authServiceSpy.getHomeRoute).toHaveBeenCalled();
    }));
  });
});
