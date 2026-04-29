import { AfterContentInit, AfterViewInit, ChangeDetectorRef, Component, ContentChildren, Input, OnChanges, OnDestroy, OnInit, QueryList, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatColumnDef, MatTable, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subject, Subscription } from 'rxjs';
import { PageResult } from '../../../core/models/pagination.model';

@Component({
  selector: 'app-paginated-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatProgressBarModule],
  template: `
    <div class="freca-card paginated-table-card">
      <mat-progress-bar *ngIf="loading" mode="indeterminate"></mat-progress-bar>
      <div class="freca-table-wrapper">
        <table mat-table [dataSource]="data" class="freca-table">
          <ng-content select="[matColumnDef]"></ng-content>

          <tr mat-header-row *matHeaderRowDef="internalColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: internalColumns"></tr>
        </table>

        <div *ngIf="!loading && total === 0" class="empty-state">
          <ng-content select="[emptyState]">
            <span aria-hidden="true" class="empty-state__mark">&mdash;</span>
            <p class="empty-state__copy">Sin resultados.</p>
          </ng-content>
        </div>
      </div>

      <mat-paginator
        [length]="total"
        [pageIndex]="pageIndex"
        [pageSize]="pageSize"
        [pageSizeOptions]="pageSizeOptions"
        (page)="onPage($event)">
      </mat-paginator>
    </div>
  `,
  styleUrls: ['./paginated-table.component.scss']
})
export class PaginatedTableComponent<T> implements OnInit, OnChanges, AfterContentInit, AfterViewInit, OnDestroy {
  @Input({ required: true }) displayedColumns: string[] = [];
  @Input({ required: true }) fetchPage!: (pageIndex: number, pageSize: number) => Promise<PageResult<T>>;
  @Input() pageSizeOptions: number[] = [10, 20, 50];
  @Input() pageSize = 10;
  @Input() refresh$?: Subject<void>;

  @ContentChildren(MatColumnDef, { descendants: true }) columnDefs!: QueryList<MatColumnDef>;
  @ViewChild(MatTable, { static: true }) table!: MatTable<T>;
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  data: T[] = [];
  total = 0;
  pageIndex = 0;
  loading = false;
  internalColumns: string[] = [];

  private refreshSub?: Subscription;
  private columnSub?: Subscription;
  private registeredColumns = new Set<string>();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (this.refresh$) {
      this.refreshSub = this.refresh$.subscribe(() => this.loadPage(0, this.pageSize));
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['displayedColumns']) {
      this.internalColumns = [...this.displayedColumns];
      this.forceRender();
    }
  }

  ngAfterContentInit(): void {
    this.registerColumns();
    this.columnSub = this.columnDefs.changes.subscribe(() => this.registerColumns());
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.loadPage(this.pageIndex, this.pageSize));
  }

  ngOnDestroy(): void {
    this.columnSub?.unsubscribe();
    this.refreshSub?.unsubscribe();
  }

  private registerColumns(): void {
    if (!this.columnDefs || !this.table) {
      return;
    }

    this.columnDefs.forEach((def) => {
      if (!this.registeredColumns.has(def.name)) {
        this.table.addColumnDef(def);
        this.registeredColumns.add(def.name);
      }
    });

    this.internalColumns = [...this.displayedColumns];
    this.forceRender();
  }

  private forceRender(): void {
    Promise.resolve().then(() => {
      const tableAny = this.table as any;
      if (tableAny?._forceRenderHeaderRows) {
        tableAny._forceRenderHeaderRows();
      }
      if (tableAny?._forceRenderFooterRows) {
        tableAny._forceRenderFooterRows();
      }
      this.table?.renderRows();
      this.cdr.detectChanges();
    });
  }

  async onPage(event: PageEvent): Promise<void> {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    await this.loadPage(this.pageIndex, this.pageSize);
  }

  async loadPage(pageIndex: number, pageSize: number): Promise<void> {
    if (!this.fetchPage) {
      return;
    }
    this.loading = true;
    try {
      const result = await this.fetchPage(pageIndex, pageSize);
      this.data = result.data;
      this.total = result.total;
      this.pageIndex = pageIndex;
      this.forceRender();
    } finally {
      this.loading = false;
    }
  }
}
