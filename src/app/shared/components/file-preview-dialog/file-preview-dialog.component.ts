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
    <h2 mat-dialog-title>Vista previa</h2>
    <mat-dialog-content>
      <ng-container *ngIf="previewType === 'image'">
        <img [src]="safeUrl" [alt]="data.name" style="max-width: 100%; border-radius: 12px;" />
      </ng-container>
      <ng-container *ngIf="previewType === 'pdf'">
        <iframe [src]="safeUrl" style="width: 100%; height: 70vh; border: none;"></iframe>
      </ng-container>
      <ng-container *ngIf="previewType === 'text'">
        <iframe [src]="safeUrl" style="width: 100%; height: 70vh; border: none;"></iframe>
      </ng-container>
      <ng-container *ngIf="previewType === 'unsupported'">
        <p>El archivo no es compatible con la vista previa en el navegador.</p>
      </ng-container>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `
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