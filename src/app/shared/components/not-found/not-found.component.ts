import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  template: `
    <div class="not-found-container">
      <section class="freca-card not-found-card">
        <div class="not-found-icon">404</div>
        <h2 class="freca-section-title">Pagina no encontrada</h2>
        <p class="freca-muted">La ruta solicitada no existe. Regresa al inicio del portal.</p>
        <button mat-flat-button color="primary" routerLink="/login" class="home-btn">
          Ir al inicio
        </button>
      </section>
    </div>
  `,
  styles: [`
    .not-found-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      padding: var(--space-lg);
    }

    .not-found-card {
      text-align: center;
      max-width: 400px;
      padding: var(--space-2xl);
    }

    .not-found-icon {
      font-family: 'Cinzel', serif;
      font-size: 4rem;
      font-weight: 700;
      color: var(--freca-gold);
      opacity: 0.6;
      margin-bottom: var(--space-lg);
      text-shadow: 0 4px 20px rgba(242, 181, 68, 0.3);
    }

    h2 {
      margin-bottom: var(--space-md);
    }

    p {
      margin-bottom: var(--space-xl);
      line-height: 1.6;
    }

    .home-btn {
      min-width: 150px;
    }
  `]
})
export class NotFoundComponent {}