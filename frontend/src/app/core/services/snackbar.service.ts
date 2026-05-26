import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  constructor(private snackBar: MatSnackBar) {}

  /** Show a success message */
  success(message: string, duration = 3000) {
    const config: MatSnackBarConfig = { duration, panelClass: ['snackbar-success'] };
    this.snackBar.open(message, 'Close', config);
  }

  /** Show an error message */
  error(message: string, duration = 5000) {
    const config: MatSnackBarConfig = { duration, panelClass: ['snackbar-error'] };
    this.snackBar.open(message, 'Close', config);
  }
}
