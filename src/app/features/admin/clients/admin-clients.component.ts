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
import { Profile } from '../../../core/models/profile.model';
import { ProfileService } from '../../../core/services/profile.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { AdminClientDialogComponent, AdminClientDialogData } from './admin-client-dialog.component';

@Component({
  selector: 'app-admin-clients',
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
          <h2 class="freca-section-title">Consultar clientes</h2>
          <p class="freca-muted">Administra usuarios activos del portal.</p>
        </div>
        <button mat-flat-button color="primary" (click)="openClientDialog()">
          Agregar cliente
        </button>
      </div>

      <form [formGroup]="filtersForm" (ngSubmit)="applyFilters()">
        <div class="freca-form-grid">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" />
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
      <ng-container matColumnDef="full_name">
        <th mat-header-cell *matHeaderCellDef>Nombre</th>
        <td mat-cell *matCellDef="let row">{{ row.full_name }}</td>
      </ng-container>

      <ng-container matColumnDef="email">
        <th mat-header-cell *matHeaderCellDef>Email</th>
        <td mat-cell *matCellDef="let row">{{ row.email }}</td>
      </ng-container>

      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Acciones</th>
        <td mat-cell *matCellDef="let row">
          <div class="freca-actions">
            <button mat-icon-button color="primary" (click)="openClientDialog(row)" matTooltip="Editar">
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
  styleUrls: ['./admin-clients.component.scss']
})
export class AdminClientsComponent {
  displayedColumns = ['full_name', 'email', 'actions'];
  refresh$ = new Subject<void>();

  filtersForm = this.fb.nonNullable.group({
    name: '',
    email: ''
  });

  private currentFilters = { name: '', email: '' };

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private dialog: MatDialog,
    private snackbar: SnackbarService
  ) {}

  fetchPage = async (pageIndex: number, pageSize: number) => {
    return this.profileService.listClients(this.currentFilters, pageIndex, pageSize);
  };

  applyFilters(): void {
    this.currentFilters = this.filtersForm.getRawValue();
    this.refresh$.next();
  }

  openClientDialog(client?: Profile): void {
    const data: AdminClientDialogData = {
      client: client ?? null
    };
    const ref = this.dialog.open(AdminClientDialogComponent, { data, width: '520px' });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.refresh$.next();
      }
    });
  }

  async confirmDelete(client: Profile): Promise<void> {
    try {
      const hasFiles = await this.profileService.hasClientFiles(client.user_id);
      const message = hasFiles
        ? 'Este cliente tiene archivos asociados. Se desactivara el acceso pero los archivos permaneceran.'
        : 'Deseas desactivar este cliente? Podra reactivarse si se actualiza el perfil.';

      const ref = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Confirmar eliminacion',
          message,
          confirmText: 'Desactivar',
          warn: true
        }
      });

      ref.afterClosed().subscribe(async (confirmed) => {
        if (confirmed) {
          await this.profileService.softDeleteClient(client.user_id);
          this.snackbar.success('Cliente desactivado correctamente.');
          this.refresh$.next();
        }
      });
    } catch (error: any) {
      this.snackbar.error(error?.message || 'No se pudo desactivar al cliente.');
    }
  }
}
