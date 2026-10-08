import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  HostListener,
  ElementRef,
  ViewChild,
  inject,
  signal,
  Output,
  EventEmitter,
  PLATFORM_ID,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { geoEquirectangular, geoPath, type GeoProjection, type GeoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { gsap } from 'gsap';

export interface PaisPresencia {
  id: string;
  codigoISO: string;
  lat: number;
  lng: number;
  anioIngreso: number;
  imagenUrl: string;
  topoId: string;
  proyectos: string[];
}

interface MarcadorPosicionado extends PaisPresencia {
  x: number;
  y: number;
}

interface PaisResaltadoPath {
  id: string;
  d: string;
}

interface Conexion {
  d: string;
  delay: number;
}

const PAISES: PaisPresencia[] = [
  {
    id: 'tunez',
    codigoISO: 'tn',
    lat: 33.8814,
    lng: 10.0982,
    anioIngreso: 2009,
    imagenUrl: 'https://images.pexels.com/photos/10958528/pexels-photo-10958528.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    topoId: '788',
    proyectos: ['proyecto1', 'proyecto2'],
  },
  {
    id: 'bolivia',
    codigoISO: 'bo',
    lat: -16.5,
    lng: -68.15,
    anioIngreso: 2025,
    imagenUrl: 'https://images.pexels.com/photos/11288661/pexels-photo-11288661.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    topoId: '068',
    proyectos: ['proyecto1'],
  },
  {
    id: 'panama',
    codigoISO: 'pa',
    lat: 8.9936,
    lng: -79.5197,
    anioIngreso: 2022,
    imagenUrl: 'https://images.pexels.com/photos/17842832/pexels-photo-17842832.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    topoId: '591',
    proyectos: [],
  },
  {
    id: 'honduras',
    codigoISO: 'hn',
    lat: 14.1,
    lng: -87.2,
    anioIngreso: 2026,
    imagenUrl: 'https://images.pexels.com/photos/31085774/pexels-photo-31085774.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    topoId: '340',
    proyectos: ['proyecto1'],
  },
  {
    id: 'guinea_bissau',
    codigoISO: 'gw',
    lat: 11.8636,
    lng: -15.5977,
    anioIngreso: 2017,
    imagenUrl: 'https://images.pexels.com/photos/33984563/pexels-photo-33984563.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    topoId: '624',
    proyectos: ['proyecto1'],
  },
  {
    id: 'sri_lanka',
    codigoISO: 'lk',
    lat: 6.9271,
    lng: 79.8612,
    anioIngreso: 2018,
    imagenUrl: 'https://images.pexels.com/photos/12571569/pexels-photo-12571569.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    topoId: '144',
    proyectos: ['proyecto1'],
  },
  {
    id: 'libia',
    codigoISO: 'ly',
    lat: 32.8872,
    lng: 13.1913,
    anioIngreso: 2019,
    imagenUrl: 'https://images.pexels.com/photos/7103169/pexels-photo-7103169.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    topoId: '434',
    proyectos: ['proyecto1'],
  },
  {
    id: 'mauritania',
    codigoISO: 'mr',
    lat: 18.0735,
    lng: -15.9582,
    anioIngreso: 2023,
    imagenUrl: 'https://images.pexels.com/photos/36566099/pexels-photo-36566099.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    topoId: '478',
    proyectos: ['proyecto1'],
  },
  {
    id: 'ucrania',
    codigoISO: 'ua',
    lat: 50.4501,
    lng: 30.5234,
    anioIngreso: 2024,
    imagenUrl: 'https://images.pexels.com/photos/29886913/pexels-photo-29886913.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    topoId: '804',
    proyectos: ['proyecto1'],
  },
];

const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const ZOOM_MIN = 1;
const ZOOM_MAX = 5;
const ZOOM_PASO = 0.4;

@Component({
  selector: 'app-mapa-mundial',
  imports: [TranslatePipe],
  templateUrl: './mapa-mundial.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './mapa-mundial.component.scss',
})
export class MapaMundialComponent implements OnInit, AfterViewInit, OnDestroy {
  private http = inject(HttpClient);
  private translate = inject(TranslateService);

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  paises = PAISES;
  paisSeleccionado = signal<PaisPresencia | null>(null);
  paisHoverId = signal<string | null>(null);

  otrosPaisesPathD = signal('');
  paisesResaltados = signal<PaisResaltadoPath[]>([]);
  marcadores = signal<MarcadorPosicionado[]>([]);
  conexiones = signal<Conexion[]>([]);
  viewBox = signal('0 0 960 480');
  cargando = signal(true);
  errorCarga = signal(false);

  zoom = signal(1);
  panX = signal(0);
  panY = signal(0);
  private arrastrando = false;
  private ultimoPunto = { x: 0, y: 0 };

  tooltipVisible = signal(false);
  tooltipTexto = signal('');
  tooltipPais = signal<PaisPresencia | null>(null);
  tooltipX = signal(0);
  tooltipY = signal(0);

  esVisible = signal(false);
  paisDestacadoId = signal<string | null>(null);
  @Output() paisDestacado = new EventEmitter<string | null>();

  private observer?: IntersectionObserver;
  private entradaJugada = false;
  private prefiereMenosMovimiento = false;
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private cicloTimer?: ReturnType<typeof setInterval>;
  private indiceCiclo = 0;

  private width = 960;
  private height = 480;
  private projection: GeoProjection | null = null;
  private topologiaCache: any = null;

  ngOnInit(): void {
    this.http.get<any>(WORLD_ATLAS_URL).subscribe({
      next: (topology) => {
        this.topologiaCache = topology;
        this.dibujarMapa(topology);
      },
      error: (err) => {
        console.error('No se pudo cargar el mapa base:', err);
        this.errorCarga.set(true);
        this.cargando.set(false);
      },
    });
  }

  ngAfterViewInit(): void {
    this.actualizarDimensiones();
    if (!this.isBrowser) return;

    this.prefiereMenosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.observer = new IntersectionObserver(
      ([entry]) => {
        this.esVisible.set(entry.isIntersecting);
        if (entry.isIntersecting) this.intentarJugarEntrada();
      },
      { threshold: 0.25 },
    );
    this.observer.observe(this.mapContainer.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.cicloTimer) clearInterval(this.cicloTimer);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.actualizarDimensiones();
    if (this.topologiaCache) this.dibujarMapa(this.topologiaCache);
  }

  private actualizarDimensiones(): void {
    const el = this.mapContainer?.nativeElement;
    if (el && el.offsetWidth > 0) {
      this.width = el.offsetWidth;
      this.height = el.offsetWidth / 2;
    }
  }

  private dibujarMapa(topology: any): void {
    this.actualizarDimensiones();

    const countries = feature(topology, topology.objects.countries) as any;
    this.projection = geoEquirectangular().fitSize([this.width, this.height], countries);
    const path: GeoPath = geoPath(this.projection);

    const idsPaisesPresencia = new Set(this.paises.map((p) => p.topoId));
    const featuresOtros = countries.features.filter((f: any) => !idsPaisesPresencia.has(String(f.id)));
    const featuresPresencia = countries.features.filter((f: any) => idsPaisesPresencia.has(String(f.id)));

    this.otrosPaisesPathD.set(
      path({ type: 'FeatureCollection', features: featuresOtros } as any) ?? '',
    );

    const topoIdAPaisId = new Map(this.paises.map((p) => [p.topoId, p.id]));
    this.paisesResaltados.set(
      featuresPresencia.map((f: any) => ({
        id: topoIdAPaisId.get(String(f.id)) ?? '',
        d: path(f) ?? '',
      })),
    );

    this.viewBox.set(`0 0 ${this.width} ${this.height}`);

    const nuevosMarcadores = this.paises.map((pais): MarcadorPosicionado => {
      const coords = this.projection!([pais.lng, pais.lat]);
      return { ...pais, x: coords?.[0] ?? 0, y: coords?.[1] ?? 0 };
    });
    this.marcadores.set(nuevosMarcadores);

    // Conexiones mesh: todos con todos
    const rutas: Conexion[] = [];
    for (let i = 0; i < nuevosMarcadores.length; i++) {
      for (let j = i + 1; j < nuevosMarcadores.length; j++) {
        rutas.push({
          d: this.generarArco(nuevosMarcadores[i], nuevosMarcadores[j]),
          delay: (i + j) * 0.3,
        });
      }
    }
    this.conexiones.set(rutas);

    this.cargando.set(false);
    this.intentarJugarEntrada();
  }

  seleccionarPais(pais: PaisPresencia): void {
    this.paisHoverId.set(pais.id);
    this.paisSeleccionado.set(pais);
  }

  seleccionarPaisPorId(id: string): void {
    const pais = this.paises.find((candidato) => candidato.id === id);
    if (pais) this.seleccionarPais(pais);
  }

  onCountryPathEnter(id: string, event: MouseEvent): void {
    const pais = this.paises.find((candidato) => candidato.id === id);
    if (!pais) return;
    this.paisHoverId.set(id);
    this.onMarkerEnter(pais, event);
  }

  onCountryPathFocus(id: string): void {
    const marcador = this.marcadores().find((candidato) => candidato.id === id);
    if (marcador) this.onMarkerFocus(marcador);
  }

  onCountryPathLeave(id: string): void {
    if (this.paisHoverId() !== id) return;
    this.paisHoverId.set(null);
    this.onMarkerLeave();
  }

  cerrarModal(): void {
    this.paisSeleccionado.set(null);
  }

  onMarkerEnter(pais: PaisPresencia, event: MouseEvent): void {
    this.paisHoverId.set(pais.id);
    this.tooltipPais.set(pais);
    this.tooltipTexto.set(this.translate.instant('mapa.paises.' + pais.id + '.nombre'));
    this.tooltipVisible.set(true);
    this.actualizarPosicionTooltip(event);
  }

  onMarkerFocus(pais: MarcadorPosicionado): void {
    this.paisHoverId.set(pais.id);
    this.tooltipPais.set(pais);
    this.tooltipTexto.set(this.translate.instant('mapa.paises.' + pais.id + '.nombre'));
    this.tooltipX.set(pais.x * this.zoom() + this.panX());
    this.tooltipY.set(pais.y * this.zoom() + this.panY());
    this.tooltipVisible.set(true);
  }

  onMarkerMove(event: MouseEvent): void {
    if (this.tooltipVisible()) this.actualizarPosicionTooltip(event);
  }

  onMarkerLeave(): void {
    this.paisHoverId.set(null);
    this.tooltipVisible.set(false);
    this.tooltipPais.set(null);
  }

  private actualizarPosicionTooltip(event: MouseEvent): void {
    const rect = this.mapContainer.nativeElement.getBoundingClientRect();
    this.tooltipX.set(event.clientX - rect.left);
    this.tooltipY.set(event.clientY - rect.top);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const rect = this.mapContainer.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const zoomAnterior = this.zoom();
    const delta = event.deltaY > 0 ? -ZOOM_PASO : ZOOM_PASO;
    const nuevoZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomAnterior + delta));
    if (nuevoZoom === zoomAnterior) return;
    const factor = nuevoZoom / zoomAnterior;
    this.panX.set(mouseX - (mouseX - this.panX()) * factor);
    this.panY.set(mouseY - (mouseY - this.panY()) * factor);
    this.zoom.set(nuevoZoom);
    if (nuevoZoom === ZOOM_MIN) {
      this.panX.set(0);
      this.panY.set(0);
    }
  }

  onPointerDown(event: PointerEvent): void {
    if (this.zoom() === ZOOM_MIN) return;
    this.arrastrando = true;
    this.ultimoPunto = { x: event.clientX, y: event.clientY };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.arrastrando) return;
    const dx = event.clientX - this.ultimoPunto.x;
    const dy = event.clientY - this.ultimoPunto.y;
    this.panX.set(this.panX() + dx);
    this.panY.set(this.panY() + dy);
    this.ultimoPunto = { x: event.clientX, y: event.clientY };
  }

  onPointerUp(): void {
    this.arrastrando = false;
  }

  zoomIn(): void {
    this.zoom.set(Math.min(ZOOM_MAX, this.zoom() + ZOOM_PASO));
  }

  zoomOut(): void {
    const nuevo = Math.max(ZOOM_MIN, this.zoom() - ZOOM_PASO);
    this.zoom.set(nuevo);
    if (nuevo === ZOOM_MIN) {
      this.panX.set(0);
      this.panY.set(0);
    }
  }

  resetVista(): void {
    this.zoom.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  private generarArco(a: { x: number; y: number }, b: { x: number; y: number }): string {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const distancia = Math.hypot(b.x - a.x, b.y - a.y);
    const alturaArco = Math.min(distancia * 0.25, 60);
    return `M ${a.x} ${a.y} Q ${mx} ${my - alturaArco} ${b.x} ${b.y}`;
  }

  // Espera a que el mapa esté visible en pantalla Y con los datos ya
  // dibujados antes de jugar la entrada una sola vez — evita que se gaste
  // la animación mientras el usuario todavía no llegó a esta sección.
  private intentarJugarEntrada(): void {
    if (!this.isBrowser || this.entradaJugada || this.cargando()) return;
    this.entradaJugada = true;
    // Un frame de margen para asegurarse de que el SVG ya esté en el DOM.
    requestAnimationFrame(() => this.jugarEntradaMapa());
  }

  private jugarEntradaMapa(): void {
    const host = this.mapContainer.nativeElement;
    const paises = gsap.utils.toArray<SVGPathElement>(host.querySelectorAll('.mapa-pais-resaltado'));
    const conexiones = gsap.utils.toArray<SVGPathElement>(host.querySelectorAll('.mapa-conexion'));
    const marcadores = gsap.utils
      .toArray<SVGGElement>(host.querySelectorAll('.mapa-marcador'))
      // Orden cronológico real de expansión (2009 → 2026), no el orden del array
      .sort((a, b) => Number(a.dataset['anio']) - Number(b.dataset['anio']));

    if (this.prefiereMenosMovimiento) {
      gsap.set([...paises, ...conexiones, ...marcadores], { opacity: 1, scale: 1 });
      return;
    }

    const tl = gsap.timeline();

    if (paises.length) {
      tl.from(paises, {
        opacity: 0,
        scale: 0.92,
        transformOrigin: '50% 50%',
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
      }, 0);
    }

    if (conexiones.length) {
      // Las conexiones ya tienen su propio flujo infinito en CSS; acá solo
      // se les da una entrada progresiva en vez de aparecer todas de golpe.
      tl.from(conexiones, { opacity: 0, duration: 0.5, stagger: 0.03, ease: 'none' }, 0.35);
    }

    if (marcadores.length) {
      tl.from(marcadores, {
        scale: 0,
        opacity: 0,
        transformOrigin: '50% 50%',
        duration: 0.55,
        stagger: 0.2,
        ease: 'back.out(2)',
      }, 0.55);
    }

    tl.call(() => this.iniciarCicloDestacado());
  }

  // Efecto "de tiempo a tiempo": cada 3.5s destaca un país distinto en el
  // mapa (marcador con pulso propio) y se lo avisa al padre vía @Output()
  // para que sincronice la tarjeta correspondiente en country-grid.
  private iniciarCicloDestacado(): void {
    if (!this.isBrowser || this.prefiereMenosMovimiento) return;
    const lista = this.marcadores();
    if (!lista.length) return;

    const destacar = (indice: number) => {
      const id = lista[indice].id;
      this.paisDestacadoId.set(id);
      this.paisDestacado.emit(id);
    };

    destacar(0);
    this.cicloTimer = setInterval(() => {
      if (!this.esVisible()) return;
      this.indiceCiclo = (this.indiceCiclo + 1) % lista.length;
      destacar(this.indiceCiclo);
    }, 3500);
  }
}
