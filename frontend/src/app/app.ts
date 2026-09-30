import { Component, OnDestroy, OnInit, AfterViewInit, signal, inject, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SeoService } from './core/seo.service';
import { HeaderComponent } from './shared/header/header.component';
import { FooterComponent } from './shared/footer/footer.component';
import { LanguageService } from './core/language.service';
import { HERO_COVER_IMAGE, HERO_COVER_IMAGES } from './core/site-media';
import { gsap } from 'gsap';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.scss',
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  loading = signal(true);
  progressWidth = signal('0%');
  heroCoverImage = signal<string>(HERO_COVER_IMAGE);

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
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private prefersReducedMotion = false;
  private destroyed = false;
  private preloaderTimers: ReturnType<typeof setTimeout>[] = [];
  private backdropTween?: gsap.core.Tween;
  private outroTimeline?: gsap.core.Timeline;

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
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    this.preloaderTimers.push(setTimeout(() => {
      if (this.destroyed) return;

      const imageIndex = Math.floor(Math.random() * HERO_COVER_IMAGES.length);
      this.heroCoverImage.set(HERO_COVER_IMAGES[imageIndex]);
      this.prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

      if (!this.prefersReducedMotion) {
        this.backdropTween = gsap.to('.preloader-backdrop img', {
          scale: 1.06,
          x: 10,
          duration: 7,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      void this.iniciarPreloader();
    }, 0));
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.preloaderTimers.forEach((timer) => clearTimeout(timer));
    this.backdropTween?.kill();
    this.outroTimeline?.kill();
  }

  private async iniciarPreloader(): Promise<void> {
    this.progressWidth.set('82%');

    const fases = this.prefersReducedMotion ? [0] : [1, 2, 3];
    fases.forEach((fase, index) => {
      this.preloaderTimers.push(setTimeout(() => {
        this.fase.set(fase);
        this.textoFase.set(this.textosPorFase[fase]);
      }, 320 * (index + 1)));
    });

    await Promise.all([
      this.esperarImagenHero(),
      this.esperar(this.prefersReducedMotion ? 500 : 1400),
    ]);
    if (this.destroyed) return;

    this.progressWidth.set('100%');
    this.fase.set(4);
    this.textoFase.set(this.textosPorFase[4]);
    await this.esperar(this.prefersReducedMotion ? 180 : 650);
    this.cerrarPreloader();
  }

  private esperarImagenHero(): Promise<void> {
    return new Promise((resolve) => {
      let finalizado = false;
      const timeout = setTimeout(finalizar, 2600);
      this.preloaderTimers.push(timeout);
      const imagen = new Image();

      function finalizar(): void {
        if (finalizado) return;
        finalizado = true;
        clearTimeout(timeout);
        resolve();
      }

      imagen.onload = () => {
        void imagen.decode().catch(() => undefined).finally(finalizar);
      };
      imagen.onerror = finalizar;
      imagen.src = this.heroCoverImage();

      if (imagen.complete && imagen.naturalWidth > 0) {
        void imagen.decode().catch(() => undefined).finally(finalizar);
      }
    });
  }

  private esperar(duracion: number): Promise<void> {
    return new Promise((resolve) => {
      this.preloaderTimers.push(setTimeout(resolve, duracion));
    });
  }

  private cerrarPreloader(): void {
    const overlay = document.querySelector<HTMLElement>('.preloader-overlay');
    const content = document.querySelector<HTMLElement>('.preloader-content');
    this.backdropTween?.kill();

    if (!overlay || !content) {
      this.loading.set(false);
      return;
    }

    this.outroTimeline = gsap.timeline({
      onComplete: () => this.loading.set(false),
    });
    this.outroTimeline
      .to(content, { scale: 0.96, autoAlpha: 0, duration: 0.42, ease: 'power2.in' })
      .to(overlay, { autoAlpha: 0, duration: 0.58, ease: 'power2.inOut' }, '-=0.16');
  }
}
