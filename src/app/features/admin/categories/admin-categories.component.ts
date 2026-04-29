import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { PaginatedTableComponent } from '../../../shared/components/paginated-table/paginated-table.component';
import { Category } from '../../../core/models/category.model';
import { CategoryService } from '../../../core/services/category.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { AdminCategoryDialogComponent, AdminCategoryDialogData } from './admin-category-dialog.component';
import { PageResult } from '../../../core/models/pagination.model';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatTooltipModule,
    PaginatedTableComponent
  ],
  template: `
    <section class="freca-card">
      <div class="header-row">
        <div>
          <h2 class="freca-section-title">Consultar categorias</h2>
          <p class="freca-muted">Administra las categorias de archivos.</p>
        </div>
        <button mat-flat-button color="primary" (click)="openCategoryDialog()">
          Agregar categoria
        </button>
      </div>

      <form [formGroup]="filtersForm" (ngSubmit)="applyFilters()">
        <div class="freca-form-grid">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
        </div>
        <div class="freca-form-actions">
          <button mat-stroked-button color="primary" type="submit">Buscar</button>
        </div>
      </form>
    </section>

    <app-paginated-table
      [displayedColumns]="displayedColumns"
      [fetchPage]="fetchPage"
      [refresh$]="refresh$">
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Nombre</th>
        <td mat-cell *matCellDef="let row">{{ row.name }}</td>
      </ng-container>

      <ng-container matColumnDef="display_order">
        <th mat-header-cell *matHeaderCellDef>Orden</th>
        <td mat-cell *matCellDef="let row">{{ row.display_order }}</td>
      </ng-container>

      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Acciones</th>
        <td mat-cell *matCellDef="let row">
          <div class="freca-actions">
            <button mat-icon-button color="primary" (click)="openCategoryDialog(row)" matTooltip="Editar">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="confirmDelete(row)" matTooltip="Eliminar">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </td>
      </ng-container>
    </app-paginated-table>
  `,
  styleUrls: ['./admin-categories.component.scss']
})
export class AdminCategoriesComponent {
  displayedColumns = ['name', 'display_order', 'actions'];
  refresh$ = new Subject<void>();

  filtersForm = this.fb.nonNullable.group({
    name: ''
  });

  private currentFilter = '';

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private dialog: MatDialog,
    private snackbar: SnackbarService
  ) {}

  fetchPage = async (pageIndex: number, pageSize: number): Promise<PageResult<Category>> => {
    const all = await this.categoryService.listCategories();
    let filtered = all;
    if (this.currentFilter) {
      const term = this.currentFilter.toLowerCase();
      filtered = all.filter((c) => c.name.toLowerCase().includes(term));
    }
    const from = pageIndex * pageSize;
    return {
      data: filtered.slice(from, from + pageSize),
      total: filtered.length
    };
  };

  applyFilters(): void {
    this.currentFilter = this.filtersForm.getRawValue().name;
    this.refresh$.next();
  }

  openCategoryDialog(category?: Category): void {
    const data: AdminCategoryDialogData = {
      category: category ?? null
    };
    const ref = this.dialog.open(AdminCategoryDialogComponent, { data, width: '420px' });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.refresh$.next();
      }
    });
  }

  async confirmDelete(category: Category): Promise<void> {
    try {
      const hasFiles = await this.categoryService.hasFiles(category.id);
      const message = hasFiles
        ? 'Esta categoria tiene archivos asociados. Reasigna los archivos a otra categoria antes de eliminar.'
        : 'Deseas eliminar esta categoria?';

      if (hasFiles) {
        this.snackbar.error(message);
        return;
      }

      const ref = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Confirmar eliminacion',
          message,
          confirmText: 'Eliminar',
          warn: true
        }
      });

      ref.afterClosed().subscribe(async (confirmed) => {
        if (confirmed) {
          await this.categoryService.deleteCategory(category.id);
          this.snackbar.success('Categoria eliminada correctamente.');
          this.refresh$.next();
        }
      });
    } catch (error: any) {
      this.snackbar.error(error?.message || 'No se pudo eliminar la categoria.');
    }
  }
}
