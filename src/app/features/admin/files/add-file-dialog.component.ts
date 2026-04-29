import { ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { catchError, debounceTime, distinctUntilChanged, from, of, Subject, switchMap, takeUntil } from 'rxjs';
import { Profile } from '../../../core/models/profile.model';
import { ProfileService } from '../../../core/services/profile.service';
import { FileService } from '../../../core/services/file.service';
import { AuthService } from '../../../core/services/auth.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { CategoryService } from '../../../core/services/category.service';
import { Category } from '../../../core/models/category.model';
import { MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES } from '../../../core/constants/app.constants';

@Component({
  selector: 'app-add-file-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>Agregar archivo</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <div class="file-picker">
          <button mat-stroked-button color="primary" type="button" (click)="fileInput.click()">
            Seleccionar archivo
          </button>
          <span class="freca-muted">{{ selectedFile?.name || 'Sin archivo seleccionado' }}</span>
          <input #fileInput type="file" hidden (change)="onFileSelected($event)" />
          <span class="freca-muted">Maximo {{ maxFileSizeMb }} MB</span>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Categoria</mat-label>
          <mat-select formControlName="categoryId">
            <mat-option *ngFor="let cat of categories" [value]="cat.id">
              {{ cat.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Clientes</mat-label>
          <mat-chip-grid #clientGrid aria-label="Clientes seleccionados">
            <mat-chip-row *ngFor="let client of selectedClientsList" (removed)="removeClient(client)">
              {{ client.full_name }} ({{ client.email }})
              <button matChipRemove type="button" aria-label="Remover cliente">&times;</button>
            </mat-chip-row>
            <input
              matInput
              #clientSearchInput
              [matAutocomplete]="clientAuto"
              [matChipInputFor]="clientGrid"
              placeholder="Escribe para buscar"
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
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || !selectedFile || loading">
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

    .file-picker {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      padding: var(--space-md);
      background: rgba(0, 0, 0, 0.2);
      border: 1px dashed rgba(242, 181, 68, 0.25);
      border-radius: var(--radius-md);
      transition: all 0.2s ease;

      &:hover {
        border-color: rgba(242, 181, 68, 0.4);
        background: rgba(0, 0, 0, 0.25);
      }

      button {
        align-self: flex-start;
      }

      .freca-muted {
        font-size: 0.875rem;
      }
    }

    mat-form-field {
      width: 100%;
    }

    .btn-content {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
    }

    ::ng-deep .mat-mdc-chip-grid {
      width: 100%;
    }

    ::ng-deep .mat-mdc-chip-row {
      background: rgba(242, 181, 68, 0.15) !important;
      border: 1px solid rgba(242, 181, 68, 0.25);

      .mdc-evolution-chip__text-label {
        color: var(--freca-gold-light);
      }

      button {
        color: var(--freca-gold);
      }
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
export class AddFileDialogComponent implements OnDestroy {
  selectedFile: File | null = null;
  clientOptions: Profile[] = [];
  categories: Category[] = [];
  loading = false;
  maxFileSizeMb = MAX_FILE_SIZE_MB;
  searchTerm = '';
  private destroyed = false;
  @ViewChild(MatAutocompleteTrigger) autocompleteTrigger?: MatAutocompleteTrigger;
  @ViewChild('clientSearchInput') clientSearchInput?: ElementRef<HTMLInputElement>;

  private destroy$ = new Subject<void>();
  private selectedClients = new Map<string, Profile>();
  private lastResults: Profile[] = [];
  private searchInput$ = new Subject<string>();

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(160)]],
    categoryId: ['', [Validators.required]],
    clientIds: [([] as string[]), [Validators.required]]
  });

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private fileService: FileService,
    private categoryService: CategoryService,
    private auth: AuthService,
    private snackbar: SnackbarService,
    private dialogRef: MatDialogRef<AddFileDialogComponent>,
    private cdr: ChangeDetectorRef
  ) {
    this.categoryService.listCategories().then((cats) => {
      this.categories = cats;
      this.cdr.detectChanges();
    });

    this.searchInput$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          const value = (term || '').toString().trim();
          this.searchTerm = value;
          if (!value) {
            return of([] as Profile[]);
          }
          return from(this.profileService.searchClients(value, 10)).pipe(catchError(() => of([] as Profile[])));
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((results) => {
        this.updateOptions(results);
      });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateOptions(results: Profile[]): void {
    this.lastResults = results;
    this.clientOptions = results.filter((client) => !this.selectedClients.has(client.user_id));
    this.queueViewUpdate();
    this.queueAutocompleteOpen();
  }

  private queueViewUpdate(): void {
    Promise.resolve().then(() => {
      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
    });
  }

  private queueAutocompleteOpen(): void {
    if (!this.searchTerm || this.clientOptions.length === 0) {
      return;
    }
    Promise.resolve().then(() => {
      this.clientSearchInput?.nativeElement.focus();
      this.autocompleteTrigger?.openPanel();
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
    this.form.get('clientIds')?.setValue(Array.from(this.selectedClients.keys()));
    this.clearSearchInput();
    this.updateOptions(this.lastResults);
  }

  removeClient(client: Profile): void {
    if (!this.selectedClients.has(client.user_id)) {
      return;
    }
    this.selectedClients.delete(client.user_id);
    this.form.get('clientIds')?.setValue(Array.from(this.selectedClients.keys()));
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.snackbar.error(`El archivo supera el maximo permitido de ${MAX_FILE_SIZE_MB} MB.`);
      input.value = '';
      return;
    }
    this.selectedFile = file;
    if (!this.form.get('name')?.value) {
      this.form.get('name')?.setValue(file.name);
    }
  }

  async save(): Promise<void> {
    if (!this.selectedFile) {
      return;
    }
    const userId = this.auth.getCurrentUserId();
    if (!userId) {
      this.snackbar.error('No hay sesion activa.');
      return;
    }

    this.loading = true;
    try {
      const { name, categoryId, clientIds } = this.form.getRawValue();
      await this.fileService.uploadFile(this.selectedFile, name!, clientIds || [], userId, categoryId!);
      this.snackbar.success('Archivo cargado correctamente.');
      this.dialogRef.close(true);
    } catch (error: any) {
      this.snackbar.error(error?.message || 'No se pudo cargar el archivo.');
    } finally {
      this.loading = false;
    }
  }
}
