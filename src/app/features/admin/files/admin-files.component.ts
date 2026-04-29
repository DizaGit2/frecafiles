import { ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, switchMap, of, from, catchError } from 'rxjs';
import { PaginatedTableComponent } from '../../../shared/components/paginated-table/paginated-table.component';
import { FileService } from '../../../core/services/file.service';
import { ProfileService } from '../../../core/services/profile.service';
import { Profile } from '../../../core/models/profile.model';
import { FileRecord } from '../../../core/models/file.model';
import { FilePreviewDialogComponent } from '../../../shared/components/file-preview-dialog/file-preview-dialog.component';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { AddFileDialogComponent } from './add-file-dialog.component';
import { isPreviewableFile } from '../../../shared/utils/file-icons';
import { UNCATEGORIZED_LABEL } from '../../../core/models/category.model';

@Component({
  selector: 'app-admin-files',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule,
    PaginatedTableComponent
  ],
  template: `
    <section class="freca-page">
      <header class="freca-page__header">
        <div class="freca-page__heading">
          <p class="freca-page__eyebrow">Administracion</p>
          <h2 class="freca-page__title">Consultar archivos</h2>
          <p class="freca-page__subtitle">Gestiona los archivos compartidos con clientes.</p>
        </div>
        <button mat-flat-button color="primary" (click)="openUploadDialog()">Agregar archivo</button>
      </header>

      <section class="freca-card filter-card">
        <form [formGroup]="filtersForm" (ngSubmit)="applyFilters()">
          <div class="freca-form-grid">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Nombre</mat-label>
              <input matInput formControlName="name" />
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="client-filter-field">
              <mat-label>Clientes</mat-label>
              <mat-chip-grid #clientGrid aria-label="Clientes seleccionados">
                <mat-chip-row *ngFor="let client of selectedClientsList" (removed)="removeClient(client)">
                  {{ client.full_name }}
                  <button matChipRemove type="button" aria-label="Remover cliente">&times;</button>
                </mat-chip-row>
                <input
                  matInput
                  #clientSearchInput
                  [matAutocomplete]="clientAuto"
                  [matChipInputFor]="clientGrid"
                  placeholder="Buscar..."
                  (input)="onSearchInput($any($event.target).value)" />
              </mat-chip-grid>
              <mat-autocomplete #clientAuto="matAutocomplete" (optionSelected)="onClientSelected($event.option.value)">
                <mat-option *ngIf="clientOptions.length === 0" disabled>
                  {{ searchTerm ? 'Sin resultados' : 'Escribe para buscar clientes' }}
                </mat-option>
                <mat-option *ngFor="let client of clientOptions" [value]="client">
                  {{ client.full_name }} ({{ client.email }})
                </mat-option>
              </mat-autocomplete>
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
        <th mat-header-cell *matHeaderCellDef>Archivo</th>
        <td mat-cell *matCellDef="let row">{{ row.name }}</td>
      </ng-container>

      <ng-container matColumnDef="category">
        <th mat-header-cell *matHeaderCellDef>Categoria</th>
        <td mat-cell *matCellDef="let row">
          <span class="freca-badge">{{ row.category?.name || uncategorizedLabel }}</span>
        </td>
      </ng-container>

      <ng-container matColumnDef="clients">
        <th mat-header-cell *matHeaderCellDef>Clientes</th>
        <td mat-cell *matCellDef="let row">
          <div class="client-chips">
            <span class="client-chip" *ngFor="let client of row.clients">
              {{ client.full_name }}
            </span>
            <span class="freca-muted" *ngIf="!row.clients?.length">Sin clientes</span>
          </div>
        </td>
      </ng-container>

      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Acciones</th>
        <td mat-cell *matCellDef="let row">
          <div class="freca-actions">
            <button mat-icon-button class="preview-btn" (click)="previewFile(row)" [disabled]="!isPreviewable(row)" matTooltip="Vista previa">
              <mat-icon>visibility</mat-icon>
            </button>
            <button mat-icon-button class="download-btn" color="primary" (click)="downloadFile(row)" matTooltip="Descargar">
              <mat-icon>download</mat-icon>
            </button>
          </div>
        </td>
      </ng-container>
      </app-paginated-table>
    </section>
  `,
  styleUrls: ['./admin-files.component.scss']
})
export class AdminFilesComponent implements OnDestroy {
  displayedColumns = ['name', 'category', 'clients', 'actions'];
  refresh$ = new Subject<void>();
  clientOptions: Profile[] = [];
  searchTerm = '';
  readonly uncategorizedLabel = UNCATEGORIZED_LABEL;

  @ViewChild(MatAutocompleteTrigger) autocompleteTrigger?: MatAutocompleteTrigger;
  @ViewChild('clientSearchInput') clientSearchInput?: ElementRef<HTMLInputElement>;

  private destroy$ = new Subject<void>();
  private selectedClients = new Map<string, Profile>();
  private lastResults: Profile[] = [];
  private searchInput$ = new Subject<string>();
  private destroyed = false;

  filtersForm = this.fb.group({
    name: ['']
  });

  private currentFilters: { name: string; clientIds: string[] } = { name: '', clientIds: [] };

  constructor(
    private fb: FormBuilder,
    private fileService: FileService,
    private profileService: ProfileService,
    private dialog: MatDialog,
    private snackbar: SnackbarService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchInput$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          const value = (term || '').toString().trim();
          this.searchTerm = value;
          if (!value) {
            return from(this.profileService.listActiveClients(10)).pipe(catchError(() => of([] as Profile[])));
          }
          return from(this.profileService.searchClients(value, 10)).pipe(catchError(() => of([] as Profile[])));
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((results) => {
        this.updateOptions(results);
      });

    // Load initial client options
    this.loadInitialClients();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadInitialClients(): Promise<void> {
    try {
      const clients = await this.profileService.listActiveClients(10);
      this.updateOptions(clients);
    } catch {
      this.clientOptions = [];
    }
  }

  private updateOptions(results: Profile[]): void {
    this.lastResults = results;
    this.clientOptions = results.filter((client) => !this.selectedClients.has(client.user_id));
    this.queueViewUpdate();
  }

  private queueViewUpdate(): void {
    Promise.resolve().then(() => {
      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
    });
  }

  get selectedClientsList(): Profile[] {
    return Array.from(this.selectedClients.values());
  }

  onClientSelected(client: Profile): void {
    if (this.selectedClients.has(client.user_id)) {
      return;
    }
    this.selectedClients.set(client.user_id, client);
    this.clearSearchInput();
    this.updateOptions(this.lastResults);
  }

  removeClient(client: Profile): void {
    if (!this.selectedClients.has(client.user_id)) {
      return;
    }
    this.selectedClients.delete(client.user_id);
    this.updateOptions(this.lastResults);
  }

  onSearchInput(value: string): void {
    this.searchInput$.next(value);
  }

  private clearSearchInput(): void {
    if (this.clientSearchInput) {
      this.clientSearchInput.nativeElement.value = '';
    }
    this.searchInput$.next('');
  }

  fetchPage = async (pageIndex: number, pageSize: number) => {
    return this.fileService.listFiles(this.currentFilters, pageIndex, pageSize);
  };

  applyFilters(): void {
    const { name } = this.filtersForm.getRawValue();
    this.currentFilters = {
      name: name ?? '',
      clientIds: Array.from(this.selectedClients.keys())
    };
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
    return isPreviewableFile(file.name);
  }
}
