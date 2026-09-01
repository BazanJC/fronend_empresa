import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SeoService } from './core/seo.service';
import { HeaderComponent } from './shared/header/header.component';
import { FooterComponent } from './shared/footer/footer.component';
import { LanguageService } from './core/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.scss',
})
export class App implements OnInit {
  loading = signal(true);
  cerrando = signal(false);
  progressWidth = signal('0%');

  /**
   * Fase del preloader (0–4):
   * 0 = Inicial — partículas orbitando, logo solo
   * 1 = Nodos 1–2 activos (Seguridad, Energía) + líneas
   * 2 = Nodos 3–4 activos (HVAC, Radiación) + más líneas
   * 3 = Nodo 5 activo (ISO) + todas las conexiones
   * 4 = IMPACTO — partículas convergen, shockwave, logo recoil
   */
  fase = signal(0);

  /** Texto dinámico según la fase actual */
  textoFase = signal('Iniciando sistemas');

  private seo = inject(SeoService);
  private language = inject(LanguageService);

  private readonly textosPorFase = [
    'Iniciando sistemas',
    'Cargando módulos críticos',
    'Sincronizando infraestructura',
    'Calibrando sensores de radiación',
    'Acceso concedido',
  ];

  ngOnInit(): void {
    this.seo.inicializar();
    this.language.inicializar();

    // Barra de progreso: 0 → 100% en 2.8s
    setTimeout(() => this.progressWidth.set('100%'), 100);

    // Secuencia de fases — tiempos extendidos
    const faseDelays = [500, 1200, 2000, 2800, 3800];
    faseDelays.forEach((delay, index) => {
      setTimeout(() => {
        this.fase.set(index);
        this.textoFase.set(this.textosPorFase[index]);
      }, delay);
    });

    // Inicia fade-out (después de que el impacto termine)
    setTimeout(() => this.cerrando.set(true), 4800);
    // Remueve del DOM
    setTimeout(() => this.loading.set(false), 5600);
  }
}
