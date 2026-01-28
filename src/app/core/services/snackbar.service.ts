import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  constructor(private snackBar: MatSnackBar) {}

  success(message: string): void {
    this.snackBar.open(message, 'Ok', { duration: 3500 });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 5000 });
  }
}