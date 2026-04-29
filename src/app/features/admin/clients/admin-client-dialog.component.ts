import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgIf } from '@angular/common';
import { Profile } from '../../../core/models/profile.model';
import { ProfileService } from '../../../core/services/profile.service';
import { SnackbarService } from '../../../core/services/snackbar.service';

export interface AdminClientDialogData {
  client: Profile | null;
}

@Component({
  selector: 'app-admin-client-dialog',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Editar cliente' : 'Agregar cliente' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="full_name" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" type="email" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || loading">
        <span class="btn-content">
          <span *ngIf="loading" class="btn-spinner" aria-hidden="true"></span>
          <span>{{ loading ? 'Guardando...' : 'Guardar' }}</span>
        </span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
    }

    .dialog-form {
      display: grid;
      gap: var(--space-lg);
      margin-top: var(--space-md);
    }

    mat-form-field {
      width: 100%;
    }

    .btn-content {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
    }

    ::ng-deep .mat-mdc-dialog-title {
      font-family: 'Cinzel', serif;
      letter-spacing: 0.04em;
      color: var(--freca-white);
    }

    ::ng-deep .mat-mdc-dialog-actions {
      padding-top: var(--space-md);
      gap: var(--space-sm);
    }

    ::ng-deep .mat-mdc-dialog-actions button[mat-stroked-button] {
      border-color: rgba(255, 255, 255, 0.15);
      color: var(--freca-ash);
      transition: all 0.2s ease;

      &:hover {
        border-color: rgba(255, 255, 255, 0.25);
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `]
})
export class AdminClientDialogComponent {
  loading = false;
  isEdit = !!this.data.client;

  form = this.fb.nonNullable.group({
    full_name: [this.data.client?.full_name ?? '', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    email: [this.data.client?.email ?? '', [Validators.required, Validators.email]]
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: AdminClientDialogData,
    private dialogRef: MatDialogRef<AdminClientDialogComponent>,
    private fb: FormBuilder,
    private profileService: ProfileService,
    private snackbar: SnackbarService
  ) {}

  async save(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    try {
      const { full_name, email } = this.form.getRawValue();
      if (this.isEdit && this.data.client) {
        await this.profileService.updateClient(this.data.client.user_id, { full_name, email });
      } else {
        await this.profileService.inviteClient(full_name!, email!);
      }
      this.snackbar.success('Cliente guardado correctamente.');
      this.dialogRef.close(true);
    } catch (error: any) {
      this.snackbar.error(error?.message || 'No se pudo guardar el cliente.');
    } finally {
      this.loading = false;
    }
  }
}
