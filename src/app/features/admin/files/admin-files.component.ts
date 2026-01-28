import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { PaginatedTableComponent } from '../../../shared/components/paginated-table/paginated-table.component';
import { FileService } from '../../../core/services/file.service';
import { ProfileService } from '../../../core/services/profile.service';
import { Profile } from '../../../core/models/profile.model';
import { FileRecord } from '../../../core/models/file.model';
import { FilePreviewDialogComponent } from '../../../shared/components/file-preview-dialog/file-preview-dialog.component';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { AddFileDialogComponent } from './add-file-dialog.component';

@Component({
  selector: 'app-admin-files',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    PaginatedTableComponent
  ],
  template: `
    <section class="freca-card">
      <div class="header-row">
        <div>
          <h2 class="freca-section-title">Consultar archivos</h2>
          <p class="freca-muted">Gestiona los archivos compartidos con clientes.</p>
        </div>
        <button mat-flat-button color="primary" (click)="openUploadDialog()">Agregar archivo</button>
      </div>

      <form [formGroup]="filtersForm" (ngSubmit)="applyFilters()" class="freca-form-grid">
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Buscar cliente</mat-label>
          <input matInput formControlName="clientSearch" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Cliente</mat-label>
          <mat-select formControlName="clientId">
            <mat-option value="">Todos</mat-option>
            <mat-option *ngFor="let client of clientOptions" [value]="client.user_id">
              {{ client.full_name }} ({{ client.email }})
            </mat-option>
          </mat-select>
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
  styleUrls: ['./admin-files.component.scss']
})
export class AdminFilesComponent {
  displayedColumns = ['name', 'actions'];
  refresh$ = new Subject<void>();
  clientOptions: Profile[] = [];

  filtersForm = this.fb.group({
    name: [''],
    clientSearch: [''],
    clientId: ['']
  });

  private currentFilters = { name: '', clientId: '' };

  constructor(
    private fb: FormBuilder,
    private fileService: FileService,
    private profileService: ProfileService,
    private dialog: MatDialog,
    private snackbar: SnackbarService
  ) {
    this.loadClientOptions('');
    this.filtersForm
      .get('clientSearch')
      ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => this.loadClientOptions(value || ''));
  }

  fetchPage = async (pageIndex: number, pageSize: number) => {
    return this.fileService.listFiles(this.currentFilters, pageIndex, pageSize);
  };

  async loadClientOptions(term: string): Promise<void> {
    try {
      if (!term) {
        this.clientOptions = await this.profileService.listActiveClients(12);
        return;
      }
      this.clientOptions = await this.profileService.searchClients(term, 12);
    } catch (error) {
      this.clientOptions = [];
    }
  }

  applyFilters(): void {
    const { name, clientId } = this.filtersForm.getRawValue();
    this.currentFilters = { name: name ?? '', clientId: clientId || '' };
    this.refresh$.next();
  }

  openUploadDialog(): void {
    const ref = this.dialog.open(AddFileDialogComponent, { width: '640px' });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.refresh$.next();
      }
    });
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
