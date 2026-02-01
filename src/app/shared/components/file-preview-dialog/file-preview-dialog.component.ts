import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

export interface FilePreviewData {
  name: string;
  url: string;
}

@Component({
  selector: 'app-file-preview-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, NgIf],
  template: `
    <h2 mat-dialog-title class="preview-title">Vista previa</h2>
    <mat-dialog-content class="preview-content">
      <ng-container *ngIf="previewType === 'image'">
        <div class="preview-image-container">
          <img [src]="safeUrl" [alt]="data.name" class="preview-image" />
        </div>
      </ng-container>
      <ng-container *ngIf="previewType === 'pdf'">
        <iframe [src]="safeUrl" class="preview-frame"></iframe>
      </ng-container>
      <ng-container *ngIf="previewType === 'text'">
        <iframe [src]="safeUrl" class="preview-frame"></iframe>
      </ng-container>
      <ng-container *ngIf="previewType === 'unsupported'">
        <div class="unsupported-message">
          <p>El archivo no es compatible con la vista previa en el navegador.</p>
        </div>
      </ng-container>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="preview-actions">
      <button mat-stroked-button mat-dialog-close class="close-btn">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
    }

    .preview-title {
      font-family: 'Cinzel', serif;
      letter-spacing: 0.04em;
      color: var(--freca-white);
    }

    .preview-content {
      padding: var(--space-md) 0;
      max-height: 75vh;
      overflow: auto;
    }

    .preview-image-container {
      display: flex;
      justify-content: center;
      align-items: center;
      background: rgba(0, 0, 0, 0.3);
      border-radius: var(--radius-md);
      padding: var(--space-md);
    }

    .preview-image {
      max-width: 100%;
      max-height: 65vh;
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
    }

    .preview-frame {
      width: 100%;
      height: 70vh;
      border: none;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.95);
    }

    .unsupported-message {
      text-align: center;
      padding: var(--space-xl);
      color: var(--freca-ash);

      p {
        margin: 0;
      }
    }

    .preview-actions {
      padding-top: var(--space-md);
    }

    .close-btn {
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
export class FilePreviewDialogComponent {
  safeUrl: SafeResourceUrl;
  previewType: 'image' | 'pdf' | 'text' | 'unsupported';

  constructor(@Inject(MAT_DIALOG_DATA) public data: FilePreviewData, sanitizer: DomSanitizer) {
    this.previewType = this.resolvePreviewType(data.name);
    this.safeUrl = sanitizer.bypassSecurityTrustResourceUrl(data.url);
  }

  private resolvePreviewType(filename: string): 'image' | 'pdf' | 'text' | 'unsupported' {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext) {
      return 'unsupported';
    }
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      return 'image';
    }
    if (ext === 'pdf') {
      return 'pdf';
    }
    if (ext === 'txt') {
      return 'text';
    }
    return 'unsupported';
  }
}