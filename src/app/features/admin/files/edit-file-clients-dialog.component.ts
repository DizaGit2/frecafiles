// TODO: extract a shared ClientChipsField component when a third caller appears.
import { ChangeDetectorRef, Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { catchError, debounceTime, distinctUntilChanged, from, of, Subject, switchMap, takeUntil } from 'rxjs';
import { Profile } from '../../../core/models/profile.model';
import { ProfileService } from '../../../core/services/profile.service';
import { FileService } from '../../../core/services/file.service';
import { SnackbarService } from '../../../core/services/snackbar.service';

export interface EditFileClientsDialogData {
  fileId: string;
  fileName: string;
}

@Component({
  selector: 'app-edit-file-clients-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatChipsModule
  ],
  template: `
    <h2 mat-dialog-title>Editar clientes de "{{ data.fileName }}"</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
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
              [disabled]="initialLoading"
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

        <p *ngIf="initialLoading" class="freca-muted loading-line">Cargando clientes actuales...</p>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || loading || initialLoading">
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

    .loading-line {
      margin: 0;
      font-size: var(--font-size-sm);
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
export class EditFileClientsDialogComponent implements OnInit, OnDestroy {
  clientOptions: Profile[] = [];
  loading = false;
  initialLoading = true;
  searchTerm = '';
  private destroyed = false;
  @ViewChild(MatAutocompleteTrigger) autocompleteTrigger?: MatAutocompleteTrigger;
  @ViewChild('clientSearchInput') clientSearchInput?: ElementRef<HTMLInputElement>;

  private destroy$ = new Subject<void>();
  private selectedClients = new Map<string, Profile>();
  private lastResults: Profile[] = [];
  private searchInput$ = new Subject<string>();

  form = this.fb.group({
    clientIds: [([] as string[]), [Validators.required]]
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: EditFileClientsDialogData,
    private fb: FormBuilder,
    private profileService: ProfileService,
    private fileService: FileService,
    private snackbar: SnackbarService,
    private dialogRef: MatDialogRef<EditFileClientsDialogComponent>,
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

  async ngOnInit(): Promise<void> {
    try {
      const current = await this.fileService.getClientsForFile(this.data.fileId);
      current.forEach((profile) => this.selectedClients.set(profile.user_id, profile));
      this.form.get('clientIds')?.setValue(Array.from(this.selectedClients.keys()));
    } catch (error: any) {
      this.snackbar.error(error?.message || 'No se pudieron cargar los clientes actuales.');
    } finally {
      this.initialLoading = false;
      this.cdr.detectChanges();
    }
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

  async save(): Promise<void> {
    this.loading = true;
    try {
      const ids = this.form.getRawValue().clientIds || [];
      await this.fileService.updateFileClients(this.data.fileId, ids);
      this.snackbar.success('Clientes actualizados.');
      this.dialogRef.close(true);
    } catch (error: any) {
      this.snackbar.error(error?.message || 'No se pudieron actualizar los clientes.');
    } finally {
      this.loading = false;
    }
  }
}
