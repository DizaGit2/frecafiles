import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { PaginatedTableComponent } from '../../../shared/components/paginated-table/paginated-table.component';
import { FileService } from '../../../core/services/file.service';
import { FileRecord } from '../../../core/models/file.model';
import { FilePreviewDialogComponent } from '../../../shared/components/file-preview-dialog/file-preview-dialog.component';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-client-files',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatTableModule, PaginatedTableComponent],
  template: `
    <section class="freca-card">
      <div class="header-row">
        <div>
          <h2 class="freca-section-title">Mis archivos</h2>
          <p class="freca-muted">Accede a los documentos disponibles para tu empresa.</p>
        </div>
      </div>

      <form [formGroup]="filtersForm" (ngSubmit)="applyFilters()" class="freca-form-grid">
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>
        <button mat-stroked-button color="primary" type="submit">Buscar</button>
      </form>
    </section>

    <app-paginated-table
      [displayedColumns]="displayedColumns"
      [fetchPage]="fetchPage"
      [refresh$]="refresh$">
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Archivo</th>
        <td mat-cell *matCellDef="let row">{{ row.name }}</td>
      </ng-container>

      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Acciones</th>
        <td mat-cell *matCellDef="let row">
          <div class="freca-actions">
            <button mat-stroked-button (click)="previewFile(row)" [disabled]="!isPreviewable(row)">
              Vista previa
            </button>
            <button mat-stroked-button color="primary" (click)="downloadFile(row)">
              Descargar
            </button>
          </div>
        </td>
      </ng-container>
    </app-paginated-table>
  `,
  styleUrls: ['./client-files.component.scss']
})
export class ClientFilesComponent {
  displayedColumns = ['name', 'actions'];
  refresh$ = new Subject<void>();

  filtersForm = this.fb.group({
    name: ['']
  });

  private currentFilters = { name: '' };

  constructor(
    private fb: FormBuilder,
    private fileService: FileService,
    private dialog: MatDialog,
    private snackbar: SnackbarService,
    private auth: AuthService
  ) {}

  fetchPage = async (pageIndex: number, pageSize: number) => {
    const userId = this.auth.getCurrentUserId();
    if (!userId) {
      return { data: [], total: 0 };
    }
    return this.fileService.listFilesForClient(userId, this.currentFilters, pageIndex, pageSize);
  };

  applyFilters(): void {
    const { name } = this.filtersForm.getRawValue();
    this.currentFilters = { name: name ?? '' };
    this.refresh$.next();
  }

  async previewFile(file: FileRecord): Promise<void> {
    if (!this.isPreviewable(file)) {
      return;
    }
    try {
      const url = await this.fileService.createSignedUrl(file.storage_path);
      this.dialog.open(FilePreviewDialogComponent, {
        data: { name: file.name, url },
        width: '80vw',
        maxWidth: '960px'
      });
    } catch (error: any) {
      this.snackbar.error(error?.message || 'No se pudo abrir la vista previa.');
    }
  }

  async downloadFile(file: FileRecord): Promise<void> {
    try {
      const url = await this.fileService.createSignedUrl(file.storage_path);
      window.open(url, '_blank');
    } catch (error: any) {
      this.snackbar.error(error?.message || 'No se pudo descargar el archivo.');
    }
  }

  isPreviewable(file: FileRecord): boolean {
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt'].includes(ext || '');
  }
}
