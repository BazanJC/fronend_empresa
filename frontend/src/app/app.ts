import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * MÓDULO 3 — Animación de carga
 * -----------------------------------------
 * El preloader vive aquí (componente raíz) porque es un elemento de
 * toda la aplicación, no específico del landing — así cuando se agreguen
 * más rutas/páginas, el preloader las cubre a todas por igual.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  loading = signal(true);
  progressWidth = signal('0%');

  ngOnInit(): void {
    // Llena la barra y luego oculta el preloader.
    // Tiempo mínimo de 2s para que la animación no se sienta cortada,
    // incluso si la app carga más rápido que eso.
    setTimeout(() => this.progressWidth.set('100%'), 100);
    setTimeout(() => this.loading.set(false), 2000);
  }
}