import { Directive, ElementRef, HostBinding, Input, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Anima un número (ej. "200+", "98%", "24/7") de 0 hasta su valor real
 * cuando el elemento entra en pantalla. Funciona con cualquier sufijo
 * (+, %, /7, etc.) — solo anima la parte numérica inicial.
 *
 * dir="ltr" fijo: los números occidentales dentro de texto árabe (RTL)
 * pueden reordenarse por el algoritmo bidi de Unicode (ej. "+50" en vez
 * de "50+"). Forzar dir="ltr" en el propio elemento evita ese problema
 * sin importar el idioma activo de la página.
 *
 * Uso: <strong appCountUp="200+"></strong>
 */
@Directive({
  selector: '[appCountUp]',
})
export class CountUpDirective implements OnInit, OnDestroy {
  @Input('appCountUp') valorObjetivo = '';

  @HostBinding('attr.dir') dir = 'ltr';

  private el = inject(ElementRef<HTMLElement>);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private observer?: IntersectionObserver;
  private yaAnimado = false;

  ngOnInit(): void {
    if (!this.isBrowser) return;

    const match = this.valorObjetivo.match(/^(\d+)(.*)$/);
    if (!match) return;

    const [, numeroStr, sufijo] = match;
    this.el.nativeElement.textContent = '0' + sufijo;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.yaAnimado) {
            this.yaAnimado = true;
            this.animar(parseInt(numeroStr, 10), sufijo);
            this.observer?.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private animar(objetivo: number, sufijo: string): void {
    const duracionMs = 1400;
    const inicio = performance.now();

    const paso = (ahora: number) => {
      const progreso = Math.min((ahora - inicio) / duracionMs, 1);
      const progresoSuave = 1 - Math.pow(1 - progreso, 3);
      const valorActual = Math.round(objetivo * progresoSuave);
      this.el.nativeElement.textContent = valorActual + sufijo;

      if (progreso < 1) requestAnimationFrame(paso);
    };

    requestAnimationFrame(paso);
  }
}