import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  warn?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title class="confirm-title">{{ data.title }}</h2>
    <mat-dialog-content class="confirm-content">
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="confirm-actions">
      <button mat-stroked-button mat-dialog-close class="cancel-btn">{{ data.cancelText || 'Cancelar' }}</button>
      <button
        mat-flat-button
        [color]="data.warn ? 'warn' : 'primary'"
        [mat-dialog-close]="true"
        class="confirm-btn">
        {{ data.confirmText || 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
    }

    .confirm-title {
      font-family: 'Cinzel', serif;
      letter-spacing: 0.04em;
      color: var(--freca-white);
      margin-bottom: var(--space-sm);
    }

    .confirm-content {
      padding: var(--space-md) 0;

      p {
        margin: 0;
        color: var(--freca-cream);
        line-height: 1.6;
      }
    }

    .confirm-actions {
      padding-top: var(--space-md);
      gap: var(--space-sm);
    }

    .cancel-btn {
      border-color: rgba(255, 255, 255, 0.15);
      color: var(--freca-ash);
      transition: all 0.2s ease;

      &:hover {
        border-color: rgba(255, 255, 255, 0.25);
        background: rgba(255, 255, 255, 0.05);
      }
    }

    .confirm-btn {
      min-width: 100px;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData) {}
}