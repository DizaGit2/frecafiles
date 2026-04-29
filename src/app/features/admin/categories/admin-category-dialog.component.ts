import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgIf } from '@angular/common';
import { Category } from '../../../core/models/category.model';
import { CategoryService } from '../../../core/services/category.service';
import { SnackbarService } from '../../../core/services/snackbar.service';

export interface AdminCategoryDialogData {
  category: Category | null;
}

@Component({
  selector: 'app-admin-category-dialog',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Editar categoria' : 'Agregar categoria' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Orden</mat-label>
          <input matInput formControlName="display_order" type="number" />
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
export class AdminCategoryDialogComponent {
  loading = false;
  isEdit = !!this.data.category;

  form = this.fb.nonNullable.group({
    name: [this.data.category?.name ?? '', [Validators.required, Validators.maxLength(100)]],
    display_order: [this.data.category?.display_order ?? 0]
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: AdminCategoryDialogData,
    private dialogRef: MatDialogRef<AdminCategoryDialogComponent>,
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private snackbar: SnackbarService
  ) {}

  async save(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    try {
      const { name, display_order } = this.form.getRawValue();
      if (this.isEdit && this.data.category) {
        await this.categoryService.updateCategory(this.data.category.id, { name, display_order });
      } else {
        await this.categoryService.createCategory(name, display_order);
      }
      this.snackbar.success('Categoria guardada correctamente.');
      this.dialogRef.close(true);
    } catch (error: any) {
      this.snackbar.error(error?.message || 'No se pudo guardar la categoria.');
    } finally {
      this.loading = false;
    }
  }
}
