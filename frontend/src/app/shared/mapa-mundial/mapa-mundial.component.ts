import { Component, OnInit, AfterViewInit, HostListener, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe } from '@ngx-translate/core';
import { geoEquirectangular, geoPath, type GeoProjection, type GeoPath } from 'd3-geo';
import { feature } from 'topojson-client';

export interface PaisPresencia {
  id: string;           // clave de traducción: mapa.paises.<id>.*
  lat: number;
  lng: number;
  anioIngreso: number;
  imagenSeed: string;   // seed para la imagen de referencia (picsum) — reemplazar por foto real cuando exista
}

interface MarcadorPosicionado extends PaisPresencia {
  x: number;
  y: number;
}

// DEMO: coordenadas reales de ciudades. El nombre/descripción/proyectos
// viven en los JSON de traducción (mapa.paises.<id>.*), no aquí.
const PAISES: PaisPresencia[] = [
  { id: 'bolivia', lat: -16.5, lng: -68.15, anioIngreso: 2021, imagenSeed: 'oficina-bolivia' },
  { id: 'honduras', lat: 14.1, lng: -87.2, anioIngreso: 2009, imagenSeed: 'oficina-honduras' },
  { id: 'usa', lat: 38.9072, lng: -77.0369, anioIngreso: 2015, imagenSeed: 'oficina-usa' },
  { id: 'francia', lat: 48.8566, lng: 2.3522, anioIngreso: 2018, imagenSeed: 'oficina-francia' }
];

// countries-110m (no land-110m): cada país es un polígono separado,
// por eso al trazar el borde se ven también las fronteras internas.
const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

@Component({
  selector: 'app-mapa-mundial',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './mapa-mundial.component.html',
  styleUrl: './mapa-mundial.component.scss'
})
export class MapaMundialComponent implements OnInit, AfterViewInit {
  private http = inject(HttpClient);

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  paises = PAISES;
  paisSeleccionado = signal<PaisPresencia | null>(null);

  countriesPathD = signal('');
  marcadores = signal<MarcadorPosicionado[]>([]);
  viewBox = signal('0 0 960 480');
  cargando = signal(true);
  errorCarga = signal(false);

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

    // FeatureCollection con CADA país como polígono separado (antes usábamos
    // "land", que fusiona todo en una sola silueta sin fronteras internas).
    const countries = feature(topology, topology.objects.countries);

    this.projection = geoEquirectangular().fitSize([this.width, this.height], countries as any);
    const path: GeoPath = geoPath(this.projection);

    // Al pintar y trazar esta misma colección, cada país dibuja su propio
    // borde — eso incluye automáticamente las fronteras con sus vecinos.
    this.countriesPathD.set(path(countries as any) ?? '');
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
}