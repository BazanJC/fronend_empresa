import {
  Component,
  signal,
  computed,
  inject,
  effect,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  NgZone,
  PLATFORM_ID,
  ViewChild,
  ViewChildren,
  QueryList,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../core/theme.service';
import { LanguageService } from '../../core/language.service';

interface SeccionNav {
  id: string;
  key: string;
  /** Id del botón principal al que pertenece: la cápsula se queda en él mientras
   *  la sección en pantalla sea esta. Si coincide con `id`, la sección es un botón principal. */
  grupo: string;
}

// Mismo orden en que aparecen las secciones en la página. Mientras se baja por la
// landing, el grupo activo solo avanza de izquierda a derecha, por eso la cápsula
// ya no salta de un lado a otro cuando pasas por una sección de "Más".
const SECCIONES_NAV: SeccionNav[] = [
  { id: 'nosotros', key: 'nav.nosotros', grupo: 'nosotros' },
  { id: 'servicios', key: 'nav.servicios', grupo: 'servicios' },
  { id: 'aliados', key: 'nav.aliados', grupo: 'servicios' },
  { id: 'nuclear', key: 'nav.nuclear', grupo: 'nuclear' },
  { id: 'equipo', key: 'nav.generador', grupo: 'nuclear' },
  { id: 'presencia', key: 'nav.presencia', grupo: 'presencia' },
  { id: 'latam', key: 'nav.latam', grupo: 'presencia' },
  { id: 'expansion', key: 'nav.trayectoria', grupo: 'presencia' },
  { id: 'proyectos', key: 'nav.proyectos', grupo: 'proyectos' },
  { id: 'porque', key: 'nav.porque', grupo: 'proyectos' },
];

const ID_CONTACTO = 'contacto';
// Todas las secciones que se siguen al hacer scroll, en orden de página.
const SECCIONES_OBSERVADAS = [...SECCIONES_NAV.map((s) => s.id), ID_CONTACTO];

@Component({
  selector: 'app-header',
  imports: [TranslatePipe],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './header.component.scss',
  host: {
    '(document:click)': 'onClickFuera($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  theme = inject(ThemeService);
  language = inject(LanguageService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private zone = inject(NgZone);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  @ViewChild('barra') private barra?: ElementRef<HTMLElement>;
  @ViewChild('progreso') private progreso?: ElementRef<HTMLElement>;
  @ViewChildren('navLink') navLinks!: QueryList<ElementRef<HTMLElement>>;

  private resizeObserver?: ResizeObserver;
  private frame = 0;
  // Mientras se hace scroll por un clic en el menú, no se recalcula la sección activa:
  // así la cápsula va directo al destino en vez de pasar por todos los botones del camino.
  private navegandoA: string | null = null;
  private liberarTimer?: ReturnType<typeof setTimeout>;
  private limiteTimer?: ReturnType<typeof setTimeout>;

  menuMovilAbierto = signal(false);
  menuMasAbierto = signal(false);
  idiomaMenuAbierto = signal(false);

  navTodas = SECCIONES_NAV;
  navPrincipal = SECCIONES_NAV.filter((s) => s.grupo === s.id);
  navMas = SECCIONES_NAV.filter((s) => s.grupo !== s.id);

  // El menú "Más" se agrupa por categoría para que sea escaneable.
  navMasGrupos = computed(() => {
    const grupos = new Map<string, SeccionNav[]>();
    for (const item of this.navMas) {
      if (!grupos.has(item.grupo)) grupos.set(item.grupo, []);
      grupos.get(item.grupo)!.push(item);
    }
    const etiquetas: Record<string, string> = {
      servicios: 'nav.servicios',
      nuclear: 'nav.nuclear',
      presencia: 'nav.presencia',
      proyectos: 'nav.proyectos',
    };
    return [...grupos.entries()].map(([grupo, items]) => ({
      grupo,
      etiqueta: etiquetas[grupo] ?? grupo,
      items,
    }));
  });

  /** Sección que está en pantalla ('' = hero, estadísticas o fuera de las secciones). */
  seccionActiva = signal<string>('');
  /** Botón principal que corresponde a la sección activa. */
  grupoActivo = computed(() => SECCIONES_NAV.find((s) => s.id === this.seccionActiva())?.grupo ?? '');
  /** La sección activa está dentro del menú "Más". */
  masActivo = computed(() => this.navMas.some((s) => s.id === this.seccionActiva()));
  contactoActivo = computed(() => this.seccionActiva() === ID_CONTACTO);

  // Cápsula deslizante: se mueve con transform (acelerado por GPU) en vez de left/top.
  indicadorX = signal(0);
  indicadorY = signal(0);
  indicadorWidth = signal(0);
  indicadorHeight = signal(0);
  indicadorVisible = signal(false);
  indicadorAnimado = signal(false);

  /** Altura real de la barra fija (incluye su borde). 0 hasta que se mide. */
  alturaBarra = signal(0);

  constructor() {
    effect(() => {
      const grupo = this.grupoActivo();
      queueMicrotask(() => this.actualizarIndicador(grupo));
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    this.medirBarra();

    // Los listeners corren fuera de Angular: un scroll no debe disparar detección de
    // cambios en toda la app. Solo se vuelve a entrar a la zona cuando algo cambia.
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onResize, { passive: true });

      if ('ResizeObserver' in window) {
        // Se recalcula cuando cambia la barra o el ancho de la pista de navegación
        // (por ejemplo al cambiar de idioma, que cambia el ancho de los textos).
        this.resizeObserver = new ResizeObserver(() => {
          this.zone.run(() => {
            this.medirBarra();
            this.actualizarIndicador(this.grupoActivo());
          });
        });
        if (this.barra) this.resizeObserver.observe(this.barra.nativeElement);
        const pista = this.host.nativeElement.querySelector('.nav-track-container');
        if (pista) this.resizeObserver.observe(pista);
      }
    });

    // Al cargar la tipografía cambia el ancho de los botones.
    document.fonts?.ready.then(() => this.zone.run(() => this.actualizarIndicador(this.grupoActivo())));

    requestAnimationFrame(() => {
      this.actualizarProgreso();
      this.sincronizarSeccionActiva();
    });
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    this.resizeObserver?.disconnect();
    cancelAnimationFrame(this.frame);
    clearTimeout(this.liberarTimer);
    clearTimeout(this.limiteTimer);
  }

  // ------------------------------------------------------------------
  // Cierre de menús
  // ------------------------------------------------------------------
  onClickFuera(event: MouseEvent): void {
    const destino = event.target;
    if (!(destino instanceof Element)) {
      this.idiomaMenuAbierto.set(false);
      this.menuMasAbierto.set(false);
      this.menuMovilAbierto.set(false);
      return;
    }
    if (this.idiomaMenuAbierto() && !destino.closest('.header-language-control')) this.idiomaMenuAbierto.set(false);
    if (this.menuMasAbierto() && !destino.closest('.header-more-control')) this.menuMasAbierto.set(false);
    if (this.menuMovilAbierto() && !destino.closest('#mobile-navigation, .header-mobile-toggle')) this.menuMovilAbierto.set(false);
  }

  onEscape(): void {
    if (this.menuMasAbierto()) {
      this.menuMasAbierto.set(false);
      // Devuelve el foco al botón "Más" para que el teclado no se pierda.
      this.navLinks?.find((ref) => ref.nativeElement.dataset['id'] === 'mas')?.nativeElement.focus();
    }
    this.idiomaMenuAbierto.set(false);
    this.menuMovilAbierto.set(false);
  }

  // ------------------------------------------------------------------
  // Navegación a secciones
  // ------------------------------------------------------------------

  /**
   * Lleva a la sección con scroll suave, descontando la altura de la barra fija, y
   * actualiza el botón activo de inmediato. Si la sección no existe en la página
   * actual, no hace nada y deja que el enlace se comporte normal.
   */
  irASeccion(id: string, evento: Event): void {
    if (!this.isBrowser) return;
    if (evento instanceof MouseEvent && (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.button !== 0)) return;

    const destino = document.getElementById(id);
    if (!destino) return;
    evento.preventDefault();

    this.menuMasAbierto.set(false);
    this.menuMovilAbierto.set(false);

    const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Se mide solo la barra: con el menú móvil abierto el header completo mide mucho más.
    const alturaBarra = this.alturaBarra() || 92;
    const top = Math.max(0, destino.getBoundingClientRect().top + window.scrollY - alturaBarra + 1);

    this.bloquearSeguimiento(id);
    this.seccionActiva.set(id === 'hero' ? '' : id);
    window.scrollTo({ top, behavior: reducirMovimiento ? (('instant' as string) as ScrollBehavior) : 'smooth' });

    // Conserva history.state para no interferir con el router de Angular.
    const url = `${location.pathname}${location.search}${id === 'hero' ? '' : '#' + id}`;
    history.replaceState(history.state, '', url);
  }

  private bloquearSeguimiento(id: string): void {
    this.navegandoA = id;
    clearTimeout(this.limiteTimer);
    // Tope de seguridad: si algo falla, el seguimiento se reactiva solo.
    this.limiteTimer = setTimeout(() => this.liberarSeguimiento(), 3000);
    this.reiniciarLiberacion();
  }

  // El scroll suave termina cuando dejan de llegar eventos de scroll.
  private reiniciarLiberacion(): void {
    clearTimeout(this.liberarTimer);
    this.liberarTimer = setTimeout(() => this.liberarSeguimiento(), 160);
  }

  private liberarSeguimiento(): void {
    clearTimeout(this.liberarTimer);
    clearTimeout(this.limiteTimer);
    this.navegandoA = null;
    this.sincronizarSeccionActiva();
  }

  // ------------------------------------------------------------------
  // Scroll: sección activa y avance de lectura
  // ------------------------------------------------------------------
  private onScroll = (): void => {
    if (this.navegandoA) this.reiniciarLiberacion();
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.actualizarProgreso();
      if (!this.navegandoA) this.sincronizarSeccionActiva();
    });
  };

  private onResize = (): void => {
    if (window.innerWidth >= 1024 && this.menuMovilAbierto()) {
      this.zone.run(() => this.menuMovilAbierto.set(false));
    }
    this.sincronizarSeccionActiva();
  };

  /**
   * Una sección es la activa cuando cruza una línea ubicada al 30 % del alto visible
   * bajo la barra. Se leen las posiciones en cada cálculo (no se guardan los elementos),
   * así funciona aunque la landing se renderice después que el header.
   */
  private detectarSeccion(): string {
    const barra = this.alturaBarra() || 92;
    const linea = barra + (window.innerHeight - barra) * 0.3;
    let actual = '';
    let ultima = '';

    for (const id of SECCIONES_OBSERVADAS) {
      const el = document.getElementById(id);
      if (!el) continue;
      ultima = id;
      const r = el.getBoundingClientRect();
      if (r.top <= linea && r.bottom > linea) actual = id;
    }

    // Al llegar al final de la página, la última sección cuenta aunque no alcance la línea.
    const alFinal = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    return alFinal && ultima ? ultima : actual;
  }

  private sincronizarSeccionActiva(): void {
    const id = this.detectarSeccion();
    if (id !== this.seccionActiva()) this.zone.run(() => this.seccionActiva.set(id));
  }

  // Se escribe directo en el elemento: actualizar un signal en cada frame de scroll
  // dispararía detección de cambios sin necesidad.
  private actualizarProgreso(): void {
    const el = this.progreso?.nativeElement;
    if (!el) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const avance = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    el.style.transform = `scaleX(${avance})`;
  }

  // ------------------------------------------------------------------
  // Altura de la barra y cápsula indicadora
  // ------------------------------------------------------------------
  private medirBarra(): void {
    const barra = this.barra?.nativeElement;
    if (!barra) return;
    const altura = Math.round(barra.getBoundingClientRect().height) + 1; // +1 por el borde inferior
    if (altura === this.alturaBarra()) return;
    this.alturaBarra.set(altura);
    // La landing la usa para el punto donde se fija la línea de tiempo.
    document.documentElement.style.setProperty('--header-h', `${altura}px`);
  }

  private actualizarIndicador(grupo: string): void {
    if (!this.isBrowser) return;
    const enlace = grupo ? this.navLinks?.find((ref) => ref.nativeElement.dataset['id'] === grupo) : undefined;
    const el = enlace?.nativeElement;

    // Sin grupo (hero, contacto) o con la navegación oculta (móvil): la cápsula se esconde.
    if (!el || !el.offsetWidth) {
      this.indicadorVisible.set(false);
      return;
    }

    if (!this.indicadorVisible()) {
      // Reaparece ya colocada en su sitio y solo después se activan las transiciones;
      // si no, cruzaría la barra desde donde se quedó.
      this.indicadorAnimado.set(false);
      this.colocarIndicador(el);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          this.indicadorAnimado.set(true);
          this.indicadorVisible.set(true);
        }),
      );
      return;
    }

    this.colocarIndicador(el);
  }

  private colocarIndicador(el: HTMLElement): void {
    this.indicadorX.set(el.offsetLeft);
    this.indicadorY.set(el.offsetTop);
    this.indicadorWidth.set(el.offsetWidth);
    this.indicadorHeight.set(el.offsetHeight);
  }

  // ------------------------------------------------------------------
  // Idioma y menús
  // ------------------------------------------------------------------
  seleccionarIdioma(codigo: string): void {
    this.language.cambiarIdioma(codigo);
    this.idiomaMenuAbierto.set(false);
    this.menuMovilAbierto.set(false);
  }

  toggleIdiomaMenu(): void {
    this.idiomaMenuAbierto.set(!this.idiomaMenuAbierto());
  }

  cerrarIdiomaMenu(): void {
    this.idiomaMenuAbierto.set(false);
  }

  toggleMenuMovil(): void {
    this.menuMovilAbierto.set(!this.menuMovilAbierto());
  }

  cerrarMenuMovil(): void {
    this.menuMovilAbierto.set(false);
  }

  toggleMenuMas(): void {
    this.menuMasAbierto.set(!this.menuMasAbierto());
  }

  cerrarMenuMas(): void {
    this.menuMasAbierto.set(false);
  }

}