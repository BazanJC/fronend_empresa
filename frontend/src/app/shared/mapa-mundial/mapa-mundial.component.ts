import { Component, OnInit, AfterViewInit, HostListener, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { geoEquirectangular, geoPath, type GeoProjection, type GeoPath } from 'd3-geo';
import { feature } from 'topojson-client';

export interface PaisPresencia {
  id: string;           // clave de traducción: mapa.paises.<id>.*
  lat: number;
  lng: number;
  anioIngreso: number;
  imagenSeed: string;
  topoId: string;        // código ISO 3166-1 numérico usado por world-atlas (para resaltar su territorio)
}

interface MarcadorPosicionado extends PaisPresencia {
  x: number;
  y: number;
}

interface PaisResaltadoPath {
  id: string;
  d: string;
}

// DEMO: coordenadas reales de ciudades. El nombre/descripción/proyectos
// viven en los JSON de traducción (mapa.paises.<id>.*), no aquí.
// topoId = código numérico ISO 3166-1 que usa world-atlas para identificar países.
const PAISES: PaisPresencia[] = [
  { id: 'bolivia', lat: -16.5, lng: -68.15, anioIngreso: 2021, imagenSeed: 'oficina-bolivia', topoId: '068' },
  { id: 'honduras', lat: 14.1, lng: -87.2, anioIngreso: 2009, imagenSeed: 'oficina-honduras', topoId: '340' },
  { id: 'usa', lat: 38.9072, lng: -77.0369, anioIngreso: 2015, imagenSeed: 'oficina-usa', topoId: '840' },
  { id: 'francia', lat: 48.8566, lng: 2.3522, anioIngreso: 2018, imagenSeed: 'oficina-francia', topoId: '250' }
];

const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const ZOOM_MIN = 1;
const ZOOM_MAX = 5;
const ZOOM_PASO = 0.4;

@Component({
  selector: 'app-mapa-mundial',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './mapa-mundial.component.html',
  styleUrl: './mapa-mundial.component.scss'
})
export class MapaMundialComponent implements OnInit, AfterViewInit {
  private http = inject(HttpClient);
  private translate = inject(TranslateService);

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  paises = PAISES;
  paisSeleccionado = signal<PaisPresencia | null>(null);

  otrosPaisesPathD = signal('');
  paisesResaltados = signal<PaisResaltadoPath[]>([]);
  marcadores = signal<MarcadorPosicionado[]>([]);
  viewBox = signal('0 0 960 480');
  cargando = signal(true);
  errorCarga = signal(false);

  // --- Zoom y arrastre ---
  zoom = signal(1);
  panX = signal(0);
  panY = signal(0);
  private arrastrando = false;
  private ultimoPunto = { x: 0, y: 0 };

  // --- Tooltip al pasar el mouse sobre un marcador ---
  tooltipVisible = signal(false);
  tooltipTexto = signal('');
  tooltipX = signal(0);
  tooltipY = signal(0);

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
      }
    });
  }

  ngAfterViewInit(): void {
    this.actualizarDimensiones();
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

    // Separamos los países donde hay oficina (para resaltarlos) del resto.
    const idsOficina = new Set(this.paises.map((p) => p.topoId));
    const featuresOtros = countries.features.filter((f: any) => !idsOficina.has(String(f.id)));
    const featuresOficina = countries.features.filter((f: any) => idsOficina.has(String(f.id)));

    this.otrosPaisesPathD.set(path({ type: 'FeatureCollection', features: featuresOtros } as any) ?? '');

    const topoIdAPaisId = new Map(this.paises.map((p) => [p.topoId, p.id]));
    this.paisesResaltados.set(
      featuresOficina.map((f: any) => ({
        id: topoIdAPaisId.get(String(f.id)) ?? '',
        d: path(f) ?? ''
      }))
    );

    this.viewBox.set(`0 0 ${this.width} ${this.height}`);

    const nuevosMarcadores = this.paises.map((pais): MarcadorPosicionado => {
      const coords = this.projection!([pais.lng, pais.lat]);
      return { ...pais, x: coords?.[0] ?? 0, y: coords?.[1] ?? 0 };
    });
    this.marcadores.set(nuevosMarcadores);

    this.cargando.set(false);
  }

  seleccionarPais(pais: PaisPresencia): void {
    this.paisSeleccionado.set(pais);
  }

  cerrarModal(): void {
    this.paisSeleccionado.set(null);
  }

  // --- Tooltip ---
  onMarkerEnter(pais: PaisPresencia, event: MouseEvent): void {
    this.tooltipTexto.set(this.translate.instant('mapa.paises.' + pais.id + '.nombre'));
    this.tooltipVisible.set(true);
    this.actualizarPosicionTooltip(event);
  }

  onMarkerMove(event: MouseEvent): void {
    if (this.tooltipVisible()) this.actualizarPosicionTooltip(event);
  }

  onMarkerLeave(): void {
    this.tooltipVisible.set(false);
  }

  private actualizarPosicionTooltip(event: MouseEvent): void {
    const rect = this.mapContainer.nativeElement.getBoundingClientRect();
    this.tooltipX.set(event.clientX - rect.left);
    this.tooltipY.set(event.clientY - rect.top);
  }

  // --- Zoom (con la rueda del mouse, anclado a la posición del cursor) ---
  onWheel(event: WheelEvent): void {
    event.preventDefault();

    const rect = this.mapContainer.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const zoomAnterior = this.zoom();
    const delta = event.deltaY > 0 ? -ZOOM_PASO : ZOOM_PASO;
    const nuevoZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomAnterior + delta));
    if (nuevoZoom === zoomAnterior) return;

    // Mantiene el punto bajo el cursor fijo mientras se hace zoom.
    const factor = nuevoZoom / zoomAnterior;
    this.panX.set(mouseX - (mouseX - this.panX()) * factor);
    this.panY.set(mouseY - (mouseY - this.panY()) * factor);
    this.zoom.set(nuevoZoom);

    if (nuevoZoom === ZOOM_MIN) {
      this.panX.set(0);
      this.panY.set(0);
    }
  }

  // --- Arrastre (mouse y touch, vía Pointer Events) ---
  onPointerDown(event: PointerEvent): void {
    if (this.zoom() === ZOOM_MIN) return; // no hace falta arrastrar sin zoom
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
}