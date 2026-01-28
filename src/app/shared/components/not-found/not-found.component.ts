import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  template: `
    <section class="freca-card">
      <h2 class="freca-section-title">Pagina no encontrada</h2>
      <p class="freca-muted">La ruta solicitada no existe. Regresa al inicio del portal.</p>
      <button mat-flat-button color="primary" routerLink="/login">Ir al inicio</button>
    </section>
  `
})
export class NotFoundComponent {}