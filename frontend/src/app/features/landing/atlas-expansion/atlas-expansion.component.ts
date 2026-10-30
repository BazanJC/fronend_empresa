import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/* ------------------------------------------------------------------
 * Proyección
 *
 * La misma del mockup: equirectangular lineal con 3,333 px por grado
 * y el borde superior del mapa fijado en los 84° N. Con estos valores
 * Gabès cae exactamente en (633.66, 167.06), igual que en el mockup.
 *
 *   x = (lon + 180) * K
 *   y = (84 - lat) * K
 *
 * El grupo SVG aplica después translate(OX, OY) scale(SC), que es el
 * encuadre que usa la cámara.
 * ------------------------------------------------------------------ */
const MAP_W = 1200;
const K = MAP_W / 360;
const LAT_TOP = 84;

/** Tamaño del escenario (coincide con el viewBox del SVG). */
const STAGE_W = 1180;
const STAGE_H = 640;
/** Encuadre del mapa dentro del escenario. */
const OX = -10;
const OY = 87.5;
const SC = 0.9833;
/** La "tarjeta" cerrada: el mapa sólo se ve dentro de este rectángulo. */
const CARD = { x: 780, y: 36, w: 360, h: 210 };
/**
 * La misma tarjeta en porcentajes del escenario: el clip-path se aplica al
 * elemento real (que puede ser más pequeño que el viewBox), así que tiene
 * que ir en % para escalarse con él.
 */
const CARD_PCT = {
  left: (CARD.x / STAGE_W) * 100,
  top: (CARD.y / STAGE_H) * 100,
  right: ((STAGE_W - (CARD.x + CARD.w)) / STAGE_W) * 100,
  bottom: ((STAGE_H - (CARD.y + CARD.h)) / STAGE_H) * 100,
};
const CARD_CENTER: [number, number] = [CARD.x + CARD.w / 2, CARD.y + CARD.h / 2];
const STAGE_CENTER: [number, number] = [STAGE_W / 2, STAGE_H / 2];
/** Altura por defecto del header fijo (el header publica la real en --header-h). */
const HEADER_OFFSET_FALLBACK = 92;
/** Ancho mínimo (px) para el modo atlas con mapa. */
const MIN_WIDTH_ATLAS = 1200;

/** Gabès: origen de todas las rutas. */
const ORIGEN_LON = 10.0982;
const ORIGIN_LAT = 33.8814;

interface AtlasRouteDef {
  key: string;
  label: string;
  start: number;
  end: number;
  lon: number;
  lat: number;
}

interface AtlasRoute extends AtlasRouteDef {
  d: string;
  x: number;
  y: number;
}

interface AtlasNode {
  key: string;
  label: string;
  x: number;
  y: number;
  end: number;
  flip: boolean;
}

interface AtlasRef {
  x: number;
  y: number;
}

interface AtlasPanel {
  id: string;
  year?: string;
  yearKey?: string;
  titleKey: string;
  descKey?: string;
  refs?: boolean;
}

/** Hitos: el orden de los paneles sigue el del mockup. */
const PANEL_AT = [0, 0.26, 0.42, 0.64, 0.8];

const ROUTES: AtlasRouteDef[] = [
  { key: 'bissau', label: '2017-19', start: 0.54, end: 0.585, lon: -15.5977, lat: 11.8636 },
  { key: 'srilanka', label: '2017-19', start: 0.585, end: 0.625, lon: 79.8612, lat: 6.9271 },
  { key: 'libya', label: '2017-19', start: 0.625, end: 0.66, lon: 13.1913, lat: 32.8872 },
  { key: 'mauritania', label: '2021-24', start: 0.69, end: 0.735, lon: -15.9582, lat: 18.0735 },
  { key: 'ukraine', label: '2021-24', start: 0.735, end: 0.78, lon: 30.5234, lat: 50.4501 },
  { key: 'tunis', label: '2025-26', start: 0.84, end: 0.87, lon: 10.18, lat: 36.8 },
  { key: 'bolivia', label: '2025-26', start: 0.87, end: 0.90, lon: -68.15, lat: -16.5 },
  { key: 'panama', label: '2025-26', start: 0.90, end: 0.92, lon: -79.5197, lat: 8.9936 },
  { key: 'honduras', label: '2026', start: 0.92, end: 0.94, lon: -87.2, lat: 14.1 },
  { key: 'colombia', label: '2026', start: 0.94, end: 0.96, lon: -74.0721, lat: 4.711 },
];

/** Referencias del panel de Túnez (puntos de referencia en el mapa). */
const REF_COORDS: Array<[number, number]> = [
  [10.17, 36.81],
  [10.11, 33.88],
  [10.77, 34.74],
  [9.87, 37.26],
  [8.82, 34.41],
  [10.11, 35.82],
  [10.83, 35.79],
];

const REF_KEYS = [
  'expansion.ref_gct',
  'expansion.ref_scg',
  'expansion.ref_steg',
  'expansion.ref_prisons',
  'expansion.ref_ports',
  'expansion.ref_world_bank',
  'expansion.ref_oim',
];

/* ------------------------------ utilidades ------------------------------ */

const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const smooth = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Coordenadas de mapa (sin el encuadre de la escena). */
const toMap = (lon: number, lat: number): [number, number] => [
  (lon + 180) * K,
  (LAT_TOP - lat) * K,
];

/** Coordenadas ya encuadradas en el escenario (lo que usa la cámara). */
const geo = (lon: number, lat: number): [number, number] => {
  const [x, y] = toMap(lon, lat);
  return [OX + SC * x, OY + SC * y];
};

/** Arco cuadrático con la curvatura hacia el norte, como en el mockup. */
const arco = (x0: number, y0: number, x1: number, y1: number): string => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const bow = Math.min(len * 0.28, 260);
  const cx = (x0 + x1) / 2 + nx * bow;
  const cy = (y0 + y1) / 2 + ny * bow;
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};

interface CameraStop {
  p: number;
  z: number;
  f: [number, number];
  a: [number, number];
}

/** Paradas de cámara: zoom, foco y anclaje de la escena. */
const STOPS: CameraStop[] = [
  { p: 0.0, z: 3.55, f: geo(10.1, 33.88), a: CARD_CENTER },
  { p: 0.14, z: 3.42, f: geo(10.1, 33.88), a: CARD_CENTER },
  { p: 0.26, z: 2.85, f: geo(10.4, 33.6), a: CARD_CENTER },
  { p: 0.4, z: 2.35, f: geo(12.0, 30.0), a: CARD_CENTER },
  { p: 0.44, z: 2.2, f: geo(10.0, 27.0), a: CARD_CENTER },
  { p: 0.6, z: 1.6, f: geo(3.0, 15.0), a: STAGE_CENTER },
  { p: 0.76, z: 1.25, f: geo(-2.0, 6.0), a: [STAGE_W * 0.64, STAGE_H * 0.5] },
  { p: 1.0, z: 1.0, f: STAGE_CENTER, a: [STAGE_W * 0.72, STAGE_H * 0.52] },
];

type AtlasMode = 'animado' | 'estatico' | 'apilado';

@Component({
  selector: 'app-atlas-expansion',
  imports: [TranslatePipe],
  templateUrl: './atlas-expansion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './atlas-expansion.component.scss',
})
export class AtlasExpansionComponent implements OnDestroy {
  private http = inject(HttpClient);
  private applicationRef = inject(ApplicationRef);
  private destroyRef = inject(DestroyRef);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // Consultas dinámicas (sin static): la hidratación de Angular puede
  // sustituir estos nodos, y con `static: true` la referencia apuntaría
  // al nodo viejo, ya desconectado del DOM.
  @ViewChild('pin') pin!: ElementRef<HTMLElement>;
  @ViewChild('pista') pista!: ElementRef<HTMLElement>;
  @ViewChild('root') root!: ElementRef<HTMLElement>;

  /** Modo de render: 'animado' (pin + scrub), 'estatico' (mapa abierto, sin motion) o 'apilado' (sin mapa). */
  readonly modo = signal<AtlasMode>('apilado');
  /** Índice del panel activo, 0..4. */
  readonly indicePanel = signal(0);
  /** countriesPath d (se rellena al cargar world.json). */
  readonly countriesD = signal('');
  readonly cargando = signal(true);

  readonly paneles: AtlasPanel[] = [
    {
      id: 'p1',
      year: '2009',
      titleKey: 'expansion.item1_title',
      descKey: 'expansion.item1_desc',
    },
    {
      id: 'p2',
      yearKey: 'expansion.references_year',
      titleKey: 'expansion.references_title',
      refs: true,
    },
    {
      id: 'p3',
      year: '2017-2019',
      titleKey: 'expansion.item2_title',
      descKey: 'expansion.item2_desc',
    },
    {
      id: 'p4',
      year: '2021-2024',
      titleKey: 'expansion.item3_title',
      descKey: 'expansion.item3_desc',
    },
    {
      id: 'p5',
      year: '2025-2026',
      titleKey: 'expansion.item4_title',
      descKey: 'expansion.item4_desc',
    },
  ];

  readonly refKeys = REF_KEYS;

  readonly origen: AtlasRef = (() => {
    const [x, y] = toMap(ORIGEN_LON, ORIGIN_LAT);
    return { x, y };
  })();

  readonly rutas: AtlasRoute[] = ROUTES.map((r) => {
    const [x, y] = toMap(r.lon, r.lat);
    const [ox, oy] = toMap(ORIGEN_LON, ORIGIN_LAT);
    return { ...r, x, y, d: arco(ox, oy, x, y) };
  });

  readonly nodos: AtlasNode[] = ROUTES.map((r) => {
    const [x, y] = toMap(r.lon, r.lat);
    // Los nodos del oeste (lon < 0) ponen la etiqueta a la izquierda
    // para que no se solapen con los del este.
    return { key: r.key, label: r.label, x, y, end: r.end, flip: r.lon < 0 };
  });

  readonly referencias: AtlasRef[] = REF_COORDS.map(([lon, lat]) => {
    const [x, y] = toMap(lon, lat);
    return { x, y };
  });

  private dash = new Map<string, number>();
  private rutaPorClave = new Map<string, AtlasRoute>(this.rutas.map((r) => [r.key, r]));

  private camEl!: SVGGElement;
  private mapLayer!: HTMLElement;
  private scrim!: HTMLElement;
  private edge!: HTMLElement;
  private frame!: HTMLElement;
  private countriesEl!: SVGPathElement;
  private railFill!: HTMLElement;
  private counter!: HTMLElement;
  private routeEls: SVGPathElement[] = [];
  private nodeEls: SVGGElement[] = [];
  private refEls: SVGCircleElement[] = [];
  private overlayEls: SVGGElement[] = [];
  private startEl!: SVGGElement;

  private scrollTrigger?: ScrollTrigger;
  private proxy = { p: 0 };
  private mq?: MediaQueryList;
  private prefersReducedMotion = false;

  constructor() {
    afterNextRender(() => this.init());
  }

  ngOnDestroy(): void {
    this.scrollTrigger?.kill(true);
    this.scrollTrigger = undefined;
    if (this.isBrowser) {
      this.mq?.removeEventListener('change', this.onCambioMedio);
    }
  }

  /* ------------------------------ arranque ------------------------------ */

  private init(): void {
    if (!this.isBrowser) return;

    gsap.registerPlugin(ScrollTrigger);

    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.mq = window.matchMedia(`(min-width: ${MIN_WIDTH_ATLAS}px)`);
    this.mq.addEventListener('change', this.onCambioMedio);

    this.cachearDom();
    this.medirRutas();
    this.evaluarModo();
    this.cargarMapa();
    this.programarRefrescos();
  }

  /**
   * El pin se calibra midiendo la sección: si el CSS del componente todavía
   * no se aplicó (los estilos llegan asíncronos en desarrollo) o si la
   * hidratación sustituyó el nodo, la medición es inválida. Se rehace el
   * trigger cuando la app está estable y el nodo en el DOM es el correcto.
   */
  private programarRefrescos(): void {
    this.applicationRef.isStable
      .pipe(
        filter((isStable): isStable is true => isStable),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        requestAnimationFrame(() => {
          this.asegurarTrigger();
          ScrollTrigger.refresh();
        });
      });

    window.addEventListener('load', this.onCargaCompleta, { once: true });

    if (document.fonts?.ready) {
      document.fonts.ready
        .then(() => {
          this.asegurarTrigger();
          ScrollTrigger.refresh();
        })
        .catch(() => undefined);
    }
  }

  /** Altura real del header fijo (la publica el header en --header-h). */
  private alturaHeader(): number {
    if (!this.isBrowser) return HEADER_OFFSET_FALLBACK;
    const valor = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
    );
    return Number.isFinite(valor) && valor > 0 ? valor : HEADER_OFFSET_FALLBACK;
  }

  /** Recrea el trigger si su elemento ya no es el que está en el DOM. */
  private asegurarTrigger(): void {
    if (!this.isBrowser || this.modo() !== 'animado') return;
    const pista = this.pista?.nativeElement;
    if (!pista || !pista.isConnected) return;
    if (this.scrollTrigger?.trigger === pista) return;
    this.crearTrigger();
  }

  private onCargaCompleta = (): void => {
    this.asegurarTrigger();
    ScrollTrigger.refresh();
  };

  private cachearDom(): void {
    const host = this.root.nativeElement;
    const q = <T extends Element>(sel: string): T => host.querySelector(sel) as T;

    this.camEl = q<SVGGElement>('#atlasCamera');
    this.mapLayer = q<HTMLElement>('#atlasMapLayer');
    this.scrim = q<HTMLElement>('#atlasScrim');
    this.edge = q<HTMLElement>('#atlasEdge');
    this.frame = q<HTMLElement>('#atlasFrame');
    this.countriesEl = q<SVGPathElement>('#atlasCountries');
    this.railFill = q<HTMLElement>('#atlasRailFill');
    this.counter = q<HTMLElement>('#atlasCounter');
    this.startEl = q<SVGGElement>('#atlasStart');

    this.routeEls = Array.from(host.querySelectorAll<SVGPathElement>('#atlasRoutes .atlas__route'));
    this.nodeEls = Array.from(host.querySelectorAll<SVGGElement>('#atlasOverlay .atlas__node'));
    this.refEls = Array.from(host.querySelectorAll<SVGCircleElement>('#atlasOverlay .atlas__ref'));
    this.overlayEls = Array.from(
      host.querySelectorAll<SVGGElement>('#atlasOverlay [data-x][data-y]'),
    );

    // Marco de la tarjeta inicial: se posiciona en % para escalarse con el
    // escenario (el viewBox es de 1180×640, el elemento real puede ser menor).
    this.frame.style.left = `${CARD_PCT.left}%`;
    this.frame.style.top = `${CARD_PCT.top}%`;
    this.frame.style.width = `${(CARD.w / STAGE_W) * 100}%`;
    this.frame.style.height = `${(CARD.h / STAGE_H) * 100}%`;
  }

  /** Longitudes de cada arco para animarlos con stroke-dashoffset. */
  private medirRutas(): void {
    for (const el of this.routeEls) {
      const key = el.dataset['key'];
      if (!key) continue;
      const len = el.getTotalLength();
      this.dash.set(key, len);
      el.style.strokeDasharray = `${len} ${len}`;
      el.style.strokeDashoffset = String(len);
    }
  }

  /* ------------------------------ mapa ------------------------------ */

  private cargarMapa(): void {
    this.http.get<any>('/world.json').subscribe({
      next: (topologia) => {
        try {
          const coleccion = feature(topologia, topologia.objects['countries']);
          const proyeccion = geoEquirectangular()
            .scale((K * 180) / Math.PI)
            .translate([MAP_W / 2, LAT_TOP * K]);
          const d = geoPath(proyeccion)(coleccion as any) ?? "";
          this.countriesD.set(d);
        } catch {
          this.countriesD.set('');
        } finally {
          this.cargando.set(false);
          ScrollTrigger.refresh();
        }
      },
      error: () => {
        this.cargando.set(false);
      },
    });
  }

  /* ------------------------------ modos ------------------------------ */

  private onCambioMedio = (): void => {
    this.evaluarModo();
  };

  private evaluarModo(): void {
    if (!this.mq) return;

    if (!this.mq.matches) {
      // Por debajo de 1200px no hay mapa: se muestra el timeline apilado.
      this.destruirTrigger();
      this.modo.set('apilado');
      return;
    }

    if (this.prefersReducedMotion) {
      // Sin animación: el mapa se muestra abierto y los paneles apilados.
      this.destruirTrigger();
      this.modo.set('estatico');
      this.apply(1);
      // En modo estático el texto va debajo del mapa: los velos estorban.
      this.scrim.style.opacity = '0';
      this.edge.style.opacity = '0';
      this.frame.style.opacity = '0';
      return;
    }

    this.modo.set('animado');
    this.crearTrigger();
  }

  private crearTrigger(): void {
    this.destruirTrigger();

    this.proxy.p = 0;
    this.apply(0);

    // ScrollTrigger sólo aporta el progreso suavizado (scrub); el "pin"
    // visual lo hace `position: sticky` sobre la pista de scroll. Así la
    // calibración no depende de mediciones que Angular pueda invalidar
    // (hidratación, cargas tardías del CSS, refrescos del layout).
    const tween = gsap.to(this.proxy, {
      p: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: this.pista.nativeElement,
        start: () => `top top+=${this.alturaHeader()}`,
        end: 'bottom bottom',
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: () => this.apply(this.proxy.p),
      },
    });

    this.scrollTrigger = tween.scrollTrigger ?? undefined;

    ScrollTrigger.refresh();
  }

  private destruirTrigger(): void {
    this.scrollTrigger?.kill(true);
    this.scrollTrigger = undefined;
    gsap.killTweensOf(this.proxy);
  }

  /* ------------------------------ cámara ------------------------------ */

  private cameraAt(p: number): {
    z: number;
    fx: number;
    fy: number;
    ax: number;
    ay: number;
  } {
    let i = 0;
    while (i < STOPS.length - 2 && p > STOPS[i + 1].p) i++;
    const a = STOPS[i];
    const b = STOPS[i + 1];
    const t = smooth(a.p, b.p, p);
    return {
      z: lerp(a.z, b.z, t),
      fx: lerp(a.f[0], b.f[0], t),
      fy: lerp(a.f[1], b.f[1], t),
      ax: lerp(a.a[0], b.a[0], t),
      ay: lerp(a.a[1], b.a[1], t),
    };
  }

  private apply(pRaw: number): void {
    if (!this.camEl) return;
    const p = clamp(pRaw);

    const cam = this.cameraAt(p);
    this.camEl.setAttribute(
      'transform',
      `translate(${cam.ax.toFixed(2)} ${cam.ay.toFixed(2)}) scale(${cam.z.toFixed(4)}) translate(${(-cam.fx).toFixed(2)} ${(-cam.fy).toFixed(2)})`,
    );

    // Los nodos, referencias y la marca de inicio viven fuera de la cámara:
    // se reposicionan a mano para mantener el tamaño en cualquier zoom.
    for (const el of this.overlayEls) {
      const sx = OX + SC * Number(el.dataset['x']);
      const sy = OY + SC * Number(el.dataset['y']);
      const px = cam.ax + cam.z * (sx - cam.fx);
      const py = cam.ay + cam.z * (sy - cam.fy);
      const escala = el === this.startEl ? 1 + 0.85 * smooth(0.06, 0.34, p) : 1;
      el.setAttribute(
        'transform',
        `translate(${px.toFixed(2)} ${py.toFixed(2)}) scale(${escala.toFixed(3)})`,
      );
      // Si el nodo cae contra el borde derecho, la etiqueta se coloca a la
      // izquierda para que no se salga del escenario.
      if (el.classList.contains('atlas__node')) {
        const flip = px > STAGE_W * 0.82;
        el.classList.toggle('is-flip', flip);
        const label = el.querySelector('.atlas__node-label');
        if (label) {
          label.setAttribute('x', flip ? '-9' : '9');
          label.setAttribute('text-anchor', flip ? 'end' : 'start');
        }
      }
    }
    if (this.startEl) {
      this.startEl.style.opacity = String(1 - smooth(0.2, 0.38, p));
    }

    // Apertura: el mapa pasa de la tarjeta a pantalla completa.
    const open = smooth(0.42, 0.58, p);
    const top = CARD_PCT.top * (1 - open);
    const right = CARD_PCT.right * (1 - open);
    const bottom = CARD_PCT.bottom * (1 - open);
    const left = CARD_PCT.left * (1 - open);
    const radio = 14 * (1 - open);
    this.mapLayer.style.clipPath = `inset(${top.toFixed(2)}% ${right.toFixed(2)}% ${bottom.toFixed(2)}% ${left.toFixed(2)}% round ${radio}px)`;
    this.frame.style.opacity = String(1 - smooth(0.43, 0.54, p));
    this.scrim.style.opacity = String(0.98 * smooth(0.42, 0.6, p));
    this.edge.style.opacity = String(smooth(0.42, 0.6, p));
    this.countriesEl.style.opacity = String(1 - 0.22 * open);

    // Arcos: se dibujan con stroke-dashoffset.
    for (const el of this.routeEls) {
      const key = el.dataset['key'];
      const def = key ? this.rutaPorClave.get(key) : undefined;
      if (!def) continue;
      const local = clamp((p - def.start) / (def.end - def.start));
      const len = this.dash.get(def.key) ?? 0;
      el.style.strokeDashoffset = String(len * (1 - local));
      el.style.opacity = local > 0 ? (p > def.end ? '0.45' : '0.9') : '0';
    }

    for (const el of this.nodeEls) {
      const fin = Number(el.dataset['end']);
      const on = p >= fin - 0.005;
      el.classList.toggle('is-on', on);
      el.style.opacity = on ? '1' : '0';
    }

    const refsOn = Math.floor(clamp((p - 0.255) / 0.12) * this.refEls.length);
    this.refEls.forEach((el, i) => el.classList.toggle('is-on', i < refsOn));

    // Rail y contador.
    this.railFill.style.width = `${p * 100}%`;
    let idx = 0;
    PANEL_AT.forEach((t, i) => {
      if (p >= t) idx = i;
    });
    const total = String(this.paneles.length).padStart(2, '0');
    this.counter.textContent = `${String(idx + 1).padStart(2, '0')} / ${total}`;
    if (idx !== this.indicePanel()) {
      this.indicePanel.set(idx);
    }
  }
}
