import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FileService, FileFilters } from '../../../core/services/file.service';
import { CategoryService } from '../../../core/services/category.service';
import { AuthService } from '../../../core/services/auth.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { FileRecord } from '../../../core/models/file.model';
import { Category, UNCATEGORIZED_LABEL } from '../../../core/models/category.model';
import { FilePreviewDialogComponent } from '../../../shared/components/file-preview-dialog/file-preview-dialog.component';
import { getFileTypeInfo, FileTypeInfo, isPreviewableFile } from '../../../shared/utils/file-icons';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';

interface FileCard extends FileRecord {
  typeInfo: FileTypeInfo;
  previewable: boolean;
}

@Component({
  selector: 'app-client-files',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule,
    FileSizePipe
  ],
  template: `
    <section class="freca-page client-page">
      <div class="files-layout">
        <aside class="files-sidebar">
          <div class="sidebar-header">
            <p class="files-sidebar__eyebrow">Archivo</p>
            <h2 class="files-sidebar__title">Mis archivos</h2>
            <div class="files-sidebar__rule" aria-hidden="true"></div>
          </div>

          <nav class="category-nav" #categoryNav>
            <button
              class="category-item"
              [class.active]="selectedCategoryId === null"
              (click)="selectCategory(null, $event)">
              <span class="category-name">Todos los archivos</span>
              <span class="category-count">{{ totalCategoryFileCount }}</span>
            </button>

            <button
              *ngFor="let cat of categories; trackBy: trackById"
              class="category-item"
              [class.active]="selectedCategoryId === cat.id"
              (click)="selectCategory(cat.id, $event)">
              <span class="category-name">{{ cat.name }}</span>
              <span class="category-count">{{ getCategoryFileCount(cat.id) }}</span>
            </button>
          </nav>
        </aside>

        <main class="files-main">
          <header class="freca-page__header main-header">
            <div class="freca-page__heading">
              <p class="freca-page__eyebrow">{{ selectedCategoryName }}</p>
              <h3 class="freca-page__title">{{ totalFiles }} <span class="files-count-suffix">{{ totalFiles === 1 ? 'archivo' : 'archivos' }}</span></h3>
            </div>
            <div class="search-bar">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-icon matPrefix>search</mat-icon>
                <input matInput [formControl]="searchControl" placeholder="Buscar archivos..." inputmode="search" autocomplete="off" />
                <button
                  *ngIf="searchControl.value"
                  matSuffix
                  mat-icon-button
                  type="button"
                  aria-label="Limpiar busqueda"
                  (click)="clearSearch()">
                  <mat-icon>close</mat-icon>
                </button>
              </mat-form-field>
              <span class="search-bar__count" *ngIf="!loading">
                {{ totalFiles }} {{ totalFiles === 1 ? 'archivo' : 'archivos' }}
              </span>
            </div>
          </header>

          <mat-progress-bar *ngIf="loading" mode="indeterminate"></mat-progress-bar>

          <div class="files-grid" *ngIf="!loading && files.length > 0">
            <article class="file-card" *ngFor="let file of files; trackBy: trackById">
              <div class="card-thumbnail">
                <mat-icon [style.color]="file.typeInfo.color">
                  {{ file.typeInfo.icon }}
                </mat-icon>
                <span class="file-type-badge" [style.color]="file.typeInfo.color">
                  {{ file.typeInfo.label }}
                </span>
              </div>
              <div class="card-body">
                <h4 class="card-title" [matTooltip]="file.name">{{ file.name }}</h4>
                <div class="card-meta">
                  <span class="card-category">{{ file.category?.name || uncategorizedLabel }}</span>
                  <div class="card-stats">
                    <span class="card-size" *ngIf="file.size_bytes">{{ file.size_bytes | fileSize }}</span>
                    <span class="card-date">{{ file.created_at | date:'dd MMM yyyy' }}</span>
                  </div>
                </div>
              </div>
              <div class="card-actions">
                <button
                  *ngIf="file.previewable"
                  mat-icon-button
                  (click)="previewFile(file)"
                  matTooltip="Vista previa"
                  aria-label="Vista previa">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button
                  mat-icon-button
                  color="primary"
                  (click)="downloadFile(file)"
                  matTooltip="Descargar"
                  aria-label="Descargar">
                  <mat-icon>download</mat-icon>
                </button>
              </div>
            </article>
          </div>

          <div class="empty-state" *ngIf="!loading && files.length === 0">
            <span aria-hidden="true" class="empty-state__mark">&mdash;</span>
            <p class="empty-state__copy">No se encontraron archivos en esta categoria.</p>
          </div>
        </main>
      </div>
    </section>
  `,
  styleUrls: ['./client-files.component.scss']
})
export class ClientFilesComponent implements OnInit, OnDestroy {
  @ViewChild('categoryNav') categoryNav?: ElementRef<HTMLElement>;

  categories: Category[] = [];
  selectedCategoryId: string | null = null;
  selectedCategoryName = 'Todos los archivos';
  files: FileCard[] = [];
  totalFiles = 0;
  totalCategoryFileCount = 0;
  loading = true;
  categoryCounts = new Map<string | null, number>();
  readonly uncategorizedLabel = UNCATEGORIZED_LABEL;

  searchForm = this.fb.group({ name: [''] });
  get searchControl() {
    return this.searchForm.controls.name;
  }

  private searchSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private fileService: FileService,
    private categoryService: CategoryService,
    private auth: AuthService,
    private dialog: MatDialog,
    private snackbar: SnackbarService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.searchSub = this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.loadFiles());

    await Promise.all([this.loadCategories(), this.loadFiles()]);
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  async loadCategories(): Promise<void> {
    const userId = this.auth.getCurrentUserId();
    if (!userId) return;

    try {
      const [categories, counts] = await Promise.all([
        this.categoryService.listCategories(),
        this.categoryService.countFilesByCategoryForClient(userId)
      ]);
      this.categories = categories;
      this.categoryCounts = counts;
      let total = 0;
      counts.forEach((v) => (total += v));
      this.totalCategoryFileCount = total;
    } catch (error: any) {
      this.snackbar.error(error?.message || 'No se pudieron cargar las categorias.');
    } finally {
      this.cdr.detectChanges();
    }
  }

  async loadFiles(): Promise<void> {
    const userId = this.auth.getCurrentUserId();
    if (!userId) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    try {
      const filters: FileFilters = {
        name: this.searchControl.value || undefined,
        categoryId: this.selectedCategoryId ?? undefined
      };
      const result = await this.fileService.listFilesForClient(userId, filters, 0, 200);
      this.files = result.data.map((f) => ({
        ...f,
        typeInfo: getFileTypeInfo(f.name),
        previewable: isPreviewableFile(f.name)
      }));
      this.totalFiles = result.total;
    } catch (error: any) {
      this.snackbar.error(error?.message || 'No se pudieron cargar los archivos.');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  selectCategory(categoryId: string | null, event?: Event): void {
    this.selectedCategoryId = categoryId;
    this.selectedCategoryName = categoryId === null
      ? 'Todos los archivos'
      : this.categories.find((c) => c.id === categoryId)?.name ?? 'Archivos';

    const target = event?.currentTarget as HTMLElement | undefined;
    if (target?.scrollIntoView) {
      target.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }

    this.loadFiles();
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  getCategoryFileCount(categoryId: string): number {
    return this.categoryCounts.get(categoryId) ?? 0;
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  async previewFile(file: FileCard): Promise<void> {
    if (!file.previewable) return;
    try {
      const url = await this.fileService.createSignedUrl(file.storage_path);
      const isPhone = window.matchMedia('(max-width: 600px)').matches;
      this.dialog.open(FilePreviewDialogComponent, {
        data: { name: file.name, url },
        width: isPhone ? '100vw' : '80vw',
        maxWidth: isPhone ? '100vw' : '960px',
        height: isPhone ? '100dvh' : undefined,
        maxHeight: isPhone ? '100dvh' : undefined,
        panelClass: isPhone ? 'fullscreen-dialog' : undefined
      });
    } catch (error: any) {
      this.snackbar.error(error?.message || 'No se pudo abrir la vista previa.');
    }
  }

  async downloadFile(file: FileCard): Promise<void> {
    try {
      const url = await this.fileService.createSignedDownloadUrl(file.storage_path, file.name);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error: any) {
      this.snackbar.error(error?.message || 'No se pudo descargar el archivo.');
    }
  }
}
