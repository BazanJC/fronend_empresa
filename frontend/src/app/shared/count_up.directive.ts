import { Directive, ElementRef, Input, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Anima un número (ej. "200+", "98%", "24/7") de 0 hasta su valor real
 * cuando el elemento entra en pantalla. Funciona con cualquier sufijo
 * (+, %, /7, etc.) — solo anima la parte numérica inicial.
 *
 * Uso: <strong appCountUp="200+"></strong>
 */
@Directive({
  selector: '[appCountUp]',
  standalone: true
})
export class CountUpDirective implements OnInit, OnDestroy {
  @Input('appCountUp') valorObjetivo = '';

  private el = inject(ElementRef<HTMLElement>);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private observer?: IntersectionObserver;
  private yaAnimado = false;

  ngOnInit(): void {
    if (!this.isBrowser) return;

    const match = this.valorObjetivo.match(/^(\d+)(.*)$/);
    if (!match) return; // si no empieza con número, se deja el texto tal cual (SSR ya lo puso)

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
      const progresoSuave = 1 - Math.pow(1 - progreso, 3); // ease-out cúbico
      const valorActual = Math.round(objetivo * progresoSuave);
      this.el.nativeElement.textContent = valorActual + sufijo;

      if (progreso < 1) requestAnimationFrame(paso);
    };

    requestAnimationFrame(paso);
  }
}