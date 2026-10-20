import {
  ApplicationRef,
  Component,
  computed,
  DestroyRef,
  inject,
  ElementRef,
  OnDestroy,
  signal,
  PLATFORM_ID,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MapaMundialComponent } from '../../shared/mapa-mundial/mapa-mundial.component';
import { AtlasExpansionComponent } from './atlas-expansion/atlas-expansion.component';
import { CountUpDirective } from '../../shared/count_up.directive';
import { ContactService } from '../../core/contact.service';
import { CLIENT_HERO_IMAGES } from '../../core/site-media';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type OficinaId = 'tunez' | 'nueva_york' | 'bolivia';

interface OficinaContacto {
  id: OficinaId;
  codigoISO: string;
  nombreKey: string;
  rolKey: string;
  empresa: string;
  direccion: string | null;
  telefono: string | null;
  telefonoHref: string | null;
  email: string;
  esMatriz: boolean;
}

@Component({
  selector: 'app-landing',
  imports: [TranslatePipe, MapaMundialComponent, AtlasExpansionComponent, CountUpDirective],
  templateUrl: './landing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private applicationRef = inject(ApplicationRef);
  private destroyRef = inject(DestroyRef);
  private contactService = inject(ContactService);
  readonly emailContacto = this.contactService.recipient;
  private observer: IntersectionObserver | null = null;
  private nuclearObserver: IntersectionObserver | null = null;
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private prefersReducedMotion = false;
  private heroLoopTweens: gsap.core.Tween[] = [];
  private cardTiltCleanups: Array<() => void> = [];
  carruselPausado = signal(false);
  paisLatamHovered = signal<string | null>(null);
  paisLatamSeleccionado = signal<string | null>('bolivia');
  paisLatamActivo = computed(() => this.paisLatamHovered() ?? this.paisLatamSeleccionado());

  slidesHero = CLIENT_HERO_IMAGES.map((image, index) => ({
    id: index + 1,
    imagen: image.src,
    alt: image.alt,
    fondo: `url("${image.src}")`,
  }));

  slideActual = signal(0);
  private carruselTimer?: ReturnType<typeof setInterval>;

  statsBar = [
    { value: '17+', labelKey: 'stats.anios', icon: 'monitor' },
    { value: '9', labelKey: 'stats.proyectos', icon: 'briefcase' },
    { value: '9', labelKey: 'stats.fabricantes', icon: 'shield' },
    { value: '8+', labelKey: 'stats.paises', icon: 'globe' },
  ];

  proyectosIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Fotos de referencia por proyecto (genéricas, temáticamente acordes a
  // cada caso) — el cliente va a reemplazarlas por fotos reales de cada
  // proyecto más adelante. Mismo orden que proyectosIndices.
  // Imágenes de referencia de Pexels, elegidas por tema; no son fotografías
  // documentales de los proyectos reales del cliente.
  proyectosImagenes = [
    'https://images.pexels.com/photos/33984563/pexels-photo-33984563.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', // 1. ONU (UNIOGBIS) Guinea-Bissau
    'https://images.pexels.com/photos/18760345/pexels-photo-18760345.jpeg?auto=compress&cs=tinysrgb&w=900&h=540&fit=crop', // 2. Acceso y control de infraestructura portuaria; Pexels: https://www.pexels.com/photo/a-barrier-at-the-entrance-to-an-industrial-area-18760345/
    'https://images.pexels.com/photos/7103169/pexels-photo-7103169.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', // 3. Elecciones - HNEC Libia
    'https://images.pexels.com/photos/37594924/pexels-photo-37594924.jpeg?auto=compress&cs=tinysrgb&w=900&h=540&fit=crop', // 4. Edificio gubernamental contemporáneo; Pexels: https://www.pexels.com/photo/modernist-architecture-of-government-building-37594924/
    'https://images.pexels.com/photos/36566099/pexels-photo-36566099.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', // 5. Infraestructuras estratégicas - Mauritania
    'https://images.pexels.com/photos/29886913/pexels-photo-29886913.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', // 6. Infraestructuras estratégicas - Ucrania
    'https://images.pexels.com/photos/10958528/pexels-photo-10958528.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', // 7. Banco Mundial - Túnez (vidrios)
    '/assets/images/proyectos/aben-cidtn-el-alto.jpg', // 8. Bolivia (ABEN): foto propia de la instalación. Hasta que exista el archivo se usa la de respaldo (ver proyectosRespaldo).
    'https://images.pexels.com/photos/37591149/pexels-photo-37591149.jpeg?auto=compress&cs=tinysrgb&w=900&h=540&fit=crop', // 9. Cámara de seguridad en infraestructura urbana; Pexels: https://www.pexels.com/photo/outdoor-surveillance-camera-on-building-wall-37591149/
  ];
  // Imagen alternativa por proyecto (mismo orden). Si la principal falla, se intenta esta una vez.
  proyectosRespaldo: (string | null)[] = [
    null,
    null,
    null,
    'https://images.pexels.com/photos/16459372/pexels-photo-16459372.jpeg?auto=compress&cs=tinysrgb&w=900&h=540&fit=crop', // 4. Gobierno
    null,
    null,
    null,
    '/assets/images/extras/tecnico.png', // 8. Bolivia (ABEN): técnico trabajando en la instalación. La foto propia es la principal (ver proyectosImagenes).
    null,
  ];
  proyectoActivo = signal(1);
  proyectosPausados = signal(false);
  private proyectosPausaManual = false;
  heroImagesLoaded = signal<Set<number>>(new Set());
  heroImagesError = signal<Set<number>>(new Set());
  private proyectosObserver: IntersectionObserver | null = null;
  private proyectosScrollFrame = 0;
  private proyectosEnVista = false;
  private proyectosPunteroDentro = false;
  private proyectosEnfocados = false;
  private proyectoProgressTween: gsap.core.Tween | null = null;
  private onProyectosViewportChange = (): void => {
    if (this.proyectosScrollFrame) cancelAnimationFrame(this.proyectosScrollFrame);

    this.proyectosScrollFrame = requestAnimationFrame(() => {
      this.proyectosScrollFrame = 0;
      const host: HTMLElement = this.el.nativeElement;
      const rect = host.querySelector<HTMLElement>('#proyectos')?.getBoundingClientRect();
      if (!rect || rect.height === 0) return;

      const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      const visible = visibleHeight / Math.min(rect.height, window.innerHeight) >= 0.1;
      if (visible === this.proyectosEnVista) return;

      this.proyectosEnVista = visible;
      this.actualizarAutoplayProyectos();
    });
  };

  // Especialidades técnicas que se muestran en la sección Servicios.
  tecnologiasCards = [
    { img: 'https://images.pexels.com/photos/7364948/pexels-photo-7364948.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', tituloKey: 'tecnologias.card1_title', descKey: 'tecnologias.card1_desc' },
    { img: 'https://images.pexels.com/photos/13657523/pexels-photo-13657523.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', tituloKey: 'tecnologias.card2_title', descKey: 'tecnologias.card2_desc' },
    { img: 'https://images.pexels.com/photos/12279352/pexels-photo-12279352.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', tituloKey: 'tecnologias.card3_title', descKey: 'tecnologias.card3_desc' },
    // Joshua Brown, Pexels photo 13007861: video intercom and keypad.
    { img: 'https://images.pexels.com/photos/13007861/pexels-photo-13007861.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', tituloKey: 'tecnologias.card4_title', descKey: 'tecnologias.card4_desc' },
    { img: 'https://images.pexels.com/photos/4373997/pexels-photo-4373997.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', tituloKey: 'tecnologias.card5_title', descKey: 'tecnologias.card5_desc' },
    { img: 'https://images.pexels.com/photos/7720712/pexels-photo-7720712.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', tituloKey: 'tecnologias.card6_title', descKey: 'tecnologias.card6_desc' },
    { img: 'https://images.pexels.com/photos/17842832/pexels-photo-17842832.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', tituloKey: 'tecnologias.card7_title', descKey: 'tecnologias.card7_desc' },
    { img: 'https://images.pexels.com/photos/32497161/pexels-photo-32497161.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', tituloKey: 'tecnologias.card8_title', descKey: 'tecnologias.card8_desc' },
    { img: 'https://images.pexels.com/photos/18471529/pexels-photo-18471529.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', tituloKey: 'tecnologias.card9_title', descKey: 'tecnologias.card9_desc' },
    { img: '/assets/images/extras/tecnico.png', tituloKey: 'tecnologias.card10_title', descKey: 'tecnologias.card10_desc' },
  ];

  // Especialidad breve por fabricante — contenido público conocido de cada
  // marca (no confirmado por el cliente); ajustar si hace falta precisión.
  aliados = [
    { nombre: 'Genetec', especialidad: 'Software de videovigilancia (VMS)', logo: 'genetec.png' },
    { nombre: 'HID Global', especialidad: 'Control de acceso y credenciales', logo: 'hid.png' },
    { nombre: 'IDEMIA', especialidad: 'Identidad y biometría', logo: 'idemia.png' },
    { nombre: 'Commend', especialidad: 'Sistemas de intercomunicación', logo: 'commend.png' },
    { nombre: 'Belden', especialidad: 'Cableado e infraestructura de red', logo: 'belden.png' },
    { nombre: 'APC', especialidad: 'Energía y respaldo (UPS)', logo: 'apc.png' },
    { nombre: 'Ruijie Networks', especialidad: 'Equipamiento de redes', logo: 'ruijie.png' },
  ];

  // Duplicado para el loop continuo del carrusel de aliados.
  aliadosLoop = [...this.aliados, ...this.aliados];

  porqueItems = [
    { icon: 'clock', titulo: 'porque.item1_title', desc: 'porque.item1_desc' },
    { icon: 'award', titulo: 'porque.item2_title', desc: 'porque.item2_desc' },
    { icon: 'link', titulo: 'porque.item3_title', desc: 'porque.item3_desc' },
    { icon: 'atom', titulo: 'porque.item4_title', desc: 'porque.item4_desc' },
    { icon: 'key', titulo: 'porque.item5_title', desc: 'porque.item5_desc' },
    { icon: 'trend', titulo: 'porque.item6_title', desc: 'porque.item6_desc' },
  ];
  razonActiva = signal(0);

  seleccionarRazon(indice: number): void {
    this.razonActiva.set(indice);
  }

  alternarRazon(indice: number): void {
    this.razonActiva.set(this.razonActiva() === indice ? -1 : indice);
  }

  latamPaises = [
    { id: 'bolivia', codigoISO: 'bo', nombreKey: 'latam.pais1_nombre', estadoKey: 'latam.pais1_estado', esSede: true, silueta: 'M13.292 15.419 17.841 15.948 20.998 15.81 22.367 13.918 27.732 11.395 30.978 9.054 38.993 8 38.353 12.672 39.104 15.07 38.596 19.261 45.264 24.875 52.131 25.918 54.537 28.26 58.688 29.507 61.228 31.342 65.092 31.278 68.646 33.147 68.911 36.807 70.126 38.651 70.192 41.39 68.404 41.498 70.766 48.916 82.535 49.175 81.629 52.88 82.292 55.41 85.626 57.216 87.083 61.219 86.001 66.311 84.301 69.158 84.897 72.873 82.976 74.221 82.888 72.211 77.169 68.882 71.473 68.783 60.786 70.677 57.849 76.425 57.695 79.956 55.266 87.863 54.272 86.44 47.295 86.171 44.889 91.504 41.289 86.709 33.252 85.097 28.152 91.088 23.736 92 21.329 82.874 18.017 75.505 19.96 69.191 16.737 66.443 15.92 61.776 12.917 57.39 16.781 50.463 14.153 45.104 15.544 42.961 14.462 40.605 16.847 37.439 16.98 32.057 17.267 27.631 18.591 25.503Z' },
    { id: 'panama', codigoISO: 'pa', nombreKey: 'latam.pais2_nombre', esSede: false, silueta: 'M90.414 46.257 88.617 48.419 92 57.158 89.251 61.573 84.546 60.495 82.643 67.689 77.727 63.429 74.608 55.427 78.203 51.459 74.502 50.454 71.753 45.528 64.458 41.403 58.009 42.359 55.048 47.514 49.128 51.258 45.903 51.761 44.476 54.849 51.454 62.902 47.489 64.807 45.374 66.987 38.502 67.739 35.965 58.89 34.062 61.423 29.198 60.545 26.238 54.573 20.211 53.594 16.405 51.861 10.115 51.886 9.692 55.1 8 52.866 8.74 49.927 9.956 46.911 9.427 44.221 11.595 42.46 8.529 40.245 8.476 34.252 14.132 32.916 19.419 38.257 19.101 41.428 24.969 42.082 26.344 40.875 30.414 44.522 37.604 43.466 43.894 39.692 52.775 36.695 57.797 32.261 65.885 33.118 65.357 34.579 73.551 35.109 80.106 37.678 84.863 42.133Z' },
    { id: 'honduras', codigoISO: 'hn', nombreKey: 'latam.pais3_nombre', esSede: false, silueta: 'M92 43.049 87.371 42.764 85.52 44.684 80.794 46.509 77.383 46.509 74.411 48.309 71.682 47.669 69.392 45.538 67.979 45.94 66.225 49.279 64.91 49.161 64.715 52.023 59.988 55.875 57.503 57.528 56.09 59.274 52.095 56.442 49.172 60.171 46.346 60.076 43.179 60.407 43.471 67.239 41.473 67.356 39.768 70.532 35.578 71.12 33.239 66.768 29.146 65.567 30.072 59.982 28.22 58.472 25.443 57.481 19.499 59.133 19.012 57.268 14.919 55.025 11.995 52.236 8 51.054 10.826 47.504 9.754 44.756 10.729 42.076 17.111 38.135 23.299 32.786 24.712 33.333 27.684 30.857 31.534 30.667 32.8 31.81 34.896 31.119 41.181 32.381 47.418 32.024 51.803 30.453 53.362 28.88 57.698 29.619 60.914 30.572 64.471 30.238 67.151 29.023 73.339 30.976 75.483 31.286 79.624 33.904 83.522 37.043 88.443 39.204Z' },
    { id: 'colombia', codigoISO: 'co', nombreKey: 'latam.pais4_nombre', esSede: false, silueta: 'M80.215 64.286 79.281 64.902 78.294 61.954 76.911 60.375 75.259 62.09 65.543 61.98 65.615 65.105 68.524 65.62 68.363 67.528 67.357 67.013 64.555 67.832 64.537 71.463 66.746 73.278 67.519 76.141 67.411 78.303 65.166 92 62.67 89.342 61.179 89.224 64.394 84.133 60.569 81.8 57.588 82.231 55.774 81.361 53.026 82.688 49.309 82.062 46.381 76.825 44.065 75.541 42.466 73.185 39.162 70.821 37.833 71.294 35.696 70.112 33.236 68.465 31.817 69.259 27.597 68.567 26.375 66.414 25.442 66.498 20.449 63.644 19.785 62.098 21.634 61.726 21.419 59.226 22.586 57.417 25.064 57.079 27.166 53.942 29.069 51.32 27.237 50.126 28.171 47.222 27.058 42.644 28.117 41.329 27.327 37.082 25.316 34.402 25.962 31.958 27.561 32.325 28.495 30.825 27.345 27.856 27.956 27.122 30.524 27.275 34.277 23.754 36.325 23.214 36.378 21.545 37.294 17.255 40.15 14.9 43.292 14.805 43.688 13.746 47.603 14.168 51.518 11.601 53.475 10.462 55.881 8 57.641 8.311 58.952 9.659 57.983 11.376 54.786 12.23 53.511 14.771 51.589 16.224 50.135 18.114 49.524 21.733 48.141 24.686 50.727 25.028 51.356 27.344 52.469 28.454 52.846 30.484 52.254 32.35 52.433 33.398 53.673 33.815 54.858 35.577 61.269 35.092 64.16 35.73 67.68 40.047 69.692 39.512 73.283 39.784 76.121 39.206 77.899 40.072 77.001 42.771 75.887 44.459 75.492 48.043 76.498 51.37 77.917 52.851 78.078 53.976 75.564 56.462 77.36 57.561 78.689 59.31Z' },
  ];

  paisLatamActivoItem = computed(() => this.latamPaises.find((pais) => pais.id === this.paisLatamActivo()) ?? null);

  // Ventana emergente de especificaciones: se abre con el puntero o el foco
  // del teclado, y se puede fijar con el botón (necesario en táctil).
  generadorFichaAbierta = signal(false);
  generadorFichaFijada = signal(false);
  private generadorPunteroDentro = false;
  private generadorEnfocado = false;

  generadorSpecs = [
    { id: 'power', titleKey: 'generador.spec_power' },
    { id: 'electrical', titleKey: 'generador.spec_electrical' },
    { id: 'engine', titleKey: 'generador.spec_engine' },
    { id: 'controller', titleKey: 'generador.spec_controller' },
    { id: 'fuel', titleKey: 'generador.spec_fuel' },
    { id: 'testing', titleKey: 'generador.spec_testing' },
  ];

  abrirFichaGenerador(event?: PointerEvent): void {
    if (event?.pointerType === 'touch') return;
    this.generadorPunteroDentro = true;
    this.generadorFichaAbierta.set(true);
  }

  salirFichaGenerador(): void {
    this.generadorPunteroDentro = false;
    this.actualizarVisibilidadFichaGenerador();
  }

  enfocarFichaGenerador(): void {
    this.generadorEnfocado = true;
    this.generadorFichaAbierta.set(true);
  }

  salirEnfoqueFichaGenerador(event: FocusEvent): void {
    const contenedor = event.currentTarget;
    if (contenedor instanceof HTMLElement && event.relatedTarget instanceof Node && contenedor.contains(event.relatedTarget)) return;

    this.generadorEnfocado = false;
    this.actualizarVisibilidadFichaGenerador();
  }

  alternarFichaGenerador(): void {
    if (this.generadorFichaFijada()) {
      this.cerrarFichaGenerador();
      return;
    }

    this.generadorFichaFijada.set(true);
    this.generadorFichaAbierta.set(true);
  }

  cerrarFichaGenerador(): void {
    this.generadorFichaFijada.set(false);
    this.generadorPunteroDentro = false;
    this.generadorEnfocado = false;
    this.generadorFichaAbierta.set(false);
  }

  private actualizarVisibilidadFichaGenerador(): void {
    this.generadorFichaAbierta.set(
      this.generadorFichaFijada() || this.generadorPunteroDentro || this.generadorEnfocado,
    );
  }

  activarPaisLatam(id: string): void {
    if (this.paisLatamActivo() === id) return;
    this.paisLatamHovered.set(id);
    this.animarSiluetaLatam(id);
  }

  salirPaisLatam(id: string): void {
    if (this.paisLatamHovered() !== id) return;
    this.paisLatamHovered.set(null);
    this.animarSiluetaLatam(this.paisLatamActivo());
  }

  seleccionarPaisLatam(id: string): void {
    this.paisLatamSeleccionado.set(this.paisLatamSeleccionado() === id ? null : id);
    this.animarSiluetaLatam(this.paisLatamActivo());
  }

  private animarSiluetaLatam(id: string | null): void {
    const seccion = (this.el.nativeElement as HTMLElement).querySelector<HTMLElement>('#latam');
    const anterior = seccion?.querySelector<SVGSVGElement>('.latam-map-panel__shape.is-current');
    const siguiente = id
      ? seccion?.querySelector<SVGSVGElement>(`.latam-map-panel__shape[data-pais="${id}"]`)
      : null;

    if (anterior && anterior !== siguiente) {
      gsap.killTweensOf(anterior);
      gsap.to(anterior, { opacity: 0, duration: this.prefersReducedMotion ? 0 : 0.38, ease: 'power2.out' });
    }
    if (!siguiente) return;

    const trazo = siguiente.querySelector<SVGPathElement>('path');
    if (!trazo) return;
    gsap.killTweensOf([siguiente, trazo]);
    if (this.prefersReducedMotion) {
      gsap.set(siguiente, { opacity: 0.78 });
      gsap.set(trazo, { strokeDasharray: 'none', strokeDashoffset: 0 });
      return;
    }

    const longitud = trazo.getTotalLength();
    gsap.fromTo(siguiente, { opacity: 0 }, { opacity: 0.78, duration: 0.55, ease: 'power2.out' });
    gsap.fromTo(trazo,
      { strokeDasharray: `${longitud} ${longitud}`, strokeDashoffset: longitud },
      { strokeDashoffset: 0, duration: 0.78, ease: 'power2.out' },
    );
  }

  nuclearHighlights = [
    { icon: 'camera', tituloKey: 'nuclear.item2_title', descKey: 'nuclear.item2_desc' },
    { icon: 'radar', tituloKey: 'nuclear.item3_title', descKey: 'nuclear.item3_desc' },
    { icon: 'doc', tituloKey: 'nuclear.item4_title', descKey: 'nuclear.item4_desc' },
  ];

  private ctx?: gsap.Context;

  constructor() {
    this.applicationRef.isStable
      .pipe(
        filter((isStable): isStable is true => isStable),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (!this.isBrowser) return;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (this.el.nativeElement.isConnected) this.iniciarEfectosNavegador();
        }));
      });
  }

  private iniciarEfectosNavegador(): void {
    if (!this.isBrowser) return;

    gsap.registerPlugin(ScrollTrigger);
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.revisarImagenesRotas();
    this.iniciarCarrusel();
    this.iniciarAnimacionesGsap();
    this.iniciarObservadorHero();
    this.iniciarObservadorNuclear();
    this.iniciarObservadorProyectos();
  }

  ngOnDestroy(): void {
    if (this.ctx) {
      this.ctx.revert();
    }
    if (this.carruselTimer) {
      clearInterval(this.carruselTimer);
    }
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.nuclearObserver) {
      this.nuclearObserver.disconnect();
    }
    if (this.proyectosObserver) {
      this.proyectosObserver.disconnect();
    }
    if (this.isBrowser) {
      window.removeEventListener('scroll', this.onProyectosViewportChange);
      window.removeEventListener('resize', this.onProyectosViewportChange);
      if (this.proyectosScrollFrame) cancelAnimationFrame(this.proyectosScrollFrame);
    }
    this.proyectoProgressTween?.kill();
      this.cardTiltCleanups.forEach((cleanup) => cleanup());
  }

  private iniciarAnimacionesGsap(): void {
    this.ctx = gsap.context(() => {
      // 1. Entrada Cinemática del Hero (sincronizada con la salida del preloader)
      const hasPreloader = typeof document !== 'undefined' && !!document.querySelector('.preloader-overlay');

      if (this.prefersReducedMotion) {
        // El usuario prefiere menos movimiento: mostramos el hero directo,
        // sin desplazamientos ni escalados de entrada.
        gsap.set(
          [
            '.hero-brand-eyebrow',
            '.hero-title',
            '.hero-subtitle',
            '.hero-actions .btn-primary, .hero-actions .btn-secondary',
            '.hero-visual',
          ],
          { opacity: 1, y: 0, scale: 1, rotation: 0, clearProps: 'transform' },
        );
      } else {
        const heroTl = gsap.timeline({
          delay: hasPreloader ? 1.05 : 0.2,
          defaults: { ease: 'power3.out' },
        });
        heroTl
          .from('.hero-brand-badge', { y: -14, scale: 0.9, opacity: 0, duration: 0.85, ease: 'back.out(1.25)' }, 0.35)
          .from('.hero-brand-eyebrow', { y: 16, opacity: 0, duration: 0.75 }, 0.45)
          .from('.hero-title', { y: 32, opacity: 0, duration: 1.1 }, '-=0.55')
          .from('.hero-subtitle', { y: 25, opacity: 0, duration: 0.9 }, '-=0.6')
          .from('.hero-actions .btn-primary, .hero-actions .btn-secondary', {
            y: 20,
            opacity: 0,
            stagger: 0.15,
            duration: 0.7,
            ease: 'back.out(1.4)',
          }, '-=0.5')
          .from('.hero-visual', { scale: 0.94, opacity: 0, duration: 1.2, ease: 'expo.out' }, '-=0.9');
      }

      // 2. Micro-animaciones discretas (isotipo ambiental y atmósfera)
      // Se omiten con reduced-motion, y se guardan en heroLoopTweens para
      // poder pausarlas cuando el hero sale del viewport (ver iniciarObservadorHero).
      if (!this.prefersReducedMotion) {
        this.heroLoopTweens.push(
          gsap.to('.atmosphere-beam--one', {
            x: '+=35',
            y: '-=25',
            rotation: '+=4',
            duration: 9,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          }),
          gsap.to('.atmosphere-beam--two', {
            x: '-=30',
            y: '+=20',
            rotation: '-=3',
            duration: 11,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          }),
        );

        gsap.to('.hero-carousel__image', {
          yPercent: -4,
          scale: 1.06,
          ease: 'none',
          scrollTrigger: {
            trigger: '.hero-section',
            start: 'top top',
            end: 'bottom top',
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });

        // La galería asciende unos píxeles durante el recorrido del hero:
        // acompaña el gesto de scroll sin fijarse ni secuestrar la página.
        gsap.fromTo(
          '.hero-carousel',
          { y: 14, rotation: 0.35, scale: 0.985 },
          {
            y: -18,
            rotation: 0,
            scale: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: '.hero-section',
              start: 'top top',
              end: 'bottom top',
              scrub: 1.1,
              invalidateOnRefresh: true,
            },
          },
        );
      }

      // 3. Barra de Estadísticas Principal — barrido (clip-path) que se
      // repite tanto al bajar como al subir (toggleActions: play/reverse en
      // ambos sentidos), a diferencia del resto de reveals que solo juegan una vez.
      gsap.fromTo(
        '.stat-item',
        { clipPath: 'inset(0 100% 0 0 round 1rem)', opacity: 0 },
        {
          clipPath: 'inset(0 0% 0 0 round 1rem)',
          opacity: 1,
          stagger: 0.12,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.stats-bar',
            start: 'top 88%',
            toggleActions: 'play reverse play reverse',
          },
        },
      );

      // 3b. Íconos de stats-bar: entrada propia (scale + rotación), también
      // repetible al bajar/subir para que acompañe al barrido de la tarjeta.
      gsap.fromTo(
        '.stat-item__icon',
        { scale: 0, rotation: -25, opacity: 0 },
        {
          scale: 1,
          rotation: 0,
          opacity: 1,
          delay: 0.25,
          stagger: 0.12,
          duration: 0.6,
          ease: 'back.out(1.9)',
          scrollTrigger: {
            trigger: '.stats-bar',
            start: 'top 88%',
            toggleActions: 'play reverse play reverse',
          },
        },
      );

      // 4. Encabezados de Secciones (Stagger sutil de editorial)
      gsap.utils.toArray('.section-heading').forEach((heading: any) => {
        gsap.from(heading, {
          scrollTrigger: {
            trigger: heading,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          y: 30,
          opacity: 0,
          duration: 0.85,
          ease: 'power2.out',
        });
      });

      // 4c. Parallax + color en las manchas de atmósfera de Quiénes Somos.
      // scrub: true ata la animación directamente a la posición del scroll
      // (no a tiempo), que es lo que produce la sensación de parallax; se
      // omite con reduced-motion porque es movimiento continuo ligado al scroll.
      if (!this.prefersReducedMotion) {
        gsap.to('.nosotros-atmosphere__blob--one', {
          y: -90,
          x: 50,
          scrollTrigger: {
            trigger: '#nosotros',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        });

        gsap.to('.nosotros-atmosphere__blob--two', {
          y: 70,
          x: -60,
          filter: 'blur(70px) hue-rotate(60deg)',
          scrollTrigger: {
            trigger: '#nosotros',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        });
      }

      // 5. Perfil y catálogo de servicios. Las especialidades entran en
      // cascada breve, mientras el proceso de trabajo aparece al final.
      if (!this.prefersReducedMotion) {
        gsap.from('#nosotros .nosotros-profile', {
          scrollTrigger: {
            trigger: '#nosotros .nosotros-profile',
            start: 'top 84%',
            toggleActions: 'play none play none',
          },
          immediateRender: false,
          y: 24,
          autoAlpha: 0,
          duration: 0.75,
          ease: 'power2.out',
          clearProps: 'opacity,transform,visibility',
        });

        gsap.from('#servicios .service-catalog-card', {
          scrollTrigger: {
            trigger: '#servicios .service-catalog-grid',
            start: 'top 82%',
            toggleActions: 'play none play none',
          },
          immediateRender: false,
          y: 34,
          autoAlpha: 0,
          scale: 0.985,
          stagger: 0.085,
          duration: 0.72,
          ease: 'power2.out',
          clearProps: 'opacity,transform,visibility',
        });

        gsap.from('#servicios .service-catalog-card__media img', {
          scrollTrigger: {
            trigger: '#servicios .service-catalog-grid',
            start: 'top 82%',
            toggleActions: 'play none play none',
          },
          immediateRender: false,
          scale: 1.08,
          stagger: 0.085,
          duration: 1,
          ease: 'power2.out',
          clearProps: 'transform',
        });

        gsap.from('#servicios .services-process-card', {
          scrollTrigger: {
            trigger: '#servicios .service-process',
            start: 'top 83%',
            toggleActions: 'play none play none',
          },
          immediateRender: false,
          y: 28,
          autoAlpha: 0,
          stagger: 0.12,
          duration: 0.72,
          ease: 'power2.out',
          clearProps: 'opacity,transform,visibility',
        });
      }

      // 5c. El mapa y las fichas regionales entran con un movimiento breve.
      // En modo de movimiento reducido, el bloque permanece visible sin tween.
      if (!this.prefersReducedMotion) {
        gsap.from('.latam-map-panel', {
          scrollTrigger: {
            trigger: '.latam-presence-grid',
            start: 'top 83%',
            toggleActions: 'play none none none',
          },
          y: 22,
          scale: 0.98,
          autoAlpha: 0,
          duration: 0.78,
          ease: 'power3.out',
          clearProps: 'opacity,transform,visibility',
        });

        gsap.from('.latam-countries li', {
          scrollTrigger: {
            trigger: '.latam-presence-grid',
            start: 'top 83%',
            toggleActions: 'play none none none',
          },
          y: 22,
          opacity: 0,
          scale: 0.985,
          stagger: 0.1,
          duration: 0.7,
          ease: 'power3.out',
          clearProps: 'opacity,transform',
        });
      }

      // 6. La línea de tiempo de expansión vive ahora en <app-atlas-expansion>:
      // mapa generado con d3-geo + world.json, cámara con ScrollTrigger y
      // pin propio. Aquí ya no hay nada que pinear.

      // 7. Tarjetas de Sectores. Importante: se anima .sector-card (la
      // tarjeta completa), nunca .sector-card__inner — ese elemento es el
      // que gira con el hover/focus (efecto flip), y si GSAP le dejara un
      // transform inline ahí, taparía el rotateY del CSS.
      gsap.from('.sector-card', {
        scrollTrigger: {
          trigger: '.sector-grid',
          start: 'top 82%',
          toggleActions: 'play none none none',
        },
        y: 40,
        opacity: 0,
        scale: 0.94,
        stagger: 0.1,
        duration: 0.85,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
      });

      // 7b. Seguridad en instalaciones nucleares — barrido horizontal tipo
      // "escaneo", acorde al tema de vigilancia/monitoreo de la sección.
      gsap.fromTo(
        '.nuclear-item',
        { clipPath: 'inset(0 0 0 100% round 1rem)', opacity: 0 },
        {
          clipPath: 'inset(0 0 0 0% round 1rem)',
          opacity: 1,
          stagger: 0.12,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.nuclear-grid',
            start: 'top 85%',
            toggleActions: 'play reverse play reverse',
          },
          // El clip se borra al terminar: un clip-path persistente recorta
          // también el box-shadow exterior, así que dejaba sin efecto el
          // halo de las tarjetas al pasar el mouse.
          clearProps: 'clipPath',
        },
      );

      // 7c. Parallax de la foto de fondo, ligado al scroll (igual criterio
      // que el resto de los parallax del sitio: se omite con reduced-motion).
      if (!this.prefersReducedMotion) {
        gsap.to('.nuclear-band__image', {
          y: '12%',
          ease: 'none',
          scrollTrigger: {
            trigger: '.nuclear-band',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        });
      }

      // 8b. Generador NOVAXIS POWER — lanzamiento del nuevo servicio.
      // La banda de metal cepillado recibe varios gestos: el título barre un
      // reflejo dorado, las tres piezas del alcance entran escalonadas, la
      // foto se descubre con un clip ascendente y el fondo se mueve en
      // parallax. Los bucles se pausan cuando la sección sale de pantalla
      // (ScrollTrigger onToggle) para no gastar CPU de más.
      if (!this.prefersReducedMotion) {
        const generador = this.el.nativeElement.querySelector('#equipo') as HTMLElement | null;

        if (generador) {
          const titulo = generador.querySelector<HTMLElement>('.section-heading h2');
          const brilloPlaca = generador.querySelector<HTMLElement>('.generator-brandplate__shine');
          const destelloMarco = generador.querySelector<HTMLElement>('.generator-stage__glint');
          const piezas = generador.querySelectorAll<HTMLElement>('.generator-offer__services li');
          const escenario = generador.querySelector<HTMLElement>('.generator-stage');

          // Reflejo del título: background-position recorre el degradado y
          // deja pasar una banda dorada cada pocos segundos.
          if (titulo) {
            const brilloTitulo = gsap.fromTo(
              titulo,
              { backgroundPosition: '115% 0' },
              {
                backgroundPosition: '-15% 0',
                duration: 2.8,
                ease: 'power2.inOut',
                repeat: -1,
                repeatDelay: 4.6,
                paused: true,
              },
            );

            ScrollTrigger.create({
              trigger: generador,
              start: 'top bottom',
              end: 'bottom top',
              onToggle: (self) => (self.isActive ? brilloTitulo.play() : brilloTitulo.pause()),
            });
          }

          // Entrada única: piezas del alcance + descubrimiento de la foto.
          const entrada = gsap.timeline({
            scrollTrigger: { trigger: generador, start: 'top 72%', toggleActions: 'play none none none' },
            defaults: { ease: 'power3.out' },
          });

          if (piezas.length) {
            // clearProps devuelve el transform al CSS: sin esto el inline de
            // GSAP taparía el hover (levantar la pieza y el barrido de luz).
            entrada.from(
              piezas,
              { y: 26, opacity: 0, stagger: 0.1, duration: 0.65, clearProps: 'transform,opacity' },
              0,
            );
          }

          if (escenario) {
            // clearProps borra el clip al terminar: si quedara inline,
            // recortaría el resplandor dorado del marco.
            entrada.fromTo(
              escenario,
              { clipPath: 'inset(0 0 100% 0 round 1.2rem)' },
              {
                clipPath: 'inset(0 0 0% 0 round 1.2rem)',
                duration: 1,
                ease: 'power3.inOut',
                clearProps: 'clipPath',
              },
              0.12,
            );
          }

          // Parallax por capas: la placa, las piezas y la foto viajan a
          // distinta velocidad para que la sección tenga profundidad.
          gsap.to('.generator-brandlockup', {
            y: -30,
            ease: 'none',
            scrollTrigger: { trigger: generador, start: 'top bottom', end: 'bottom top', scrub: 1 },
          });

          gsap.to('.generator-offer', {
            y: -16,
            ease: 'none',
            scrollTrigger: { trigger: generador, start: 'top bottom', end: 'bottom top', scrub: 1.2 },
          });

          // La foto se mueve dentro del marco (zoom lento + deriva vertical):
          // el efecto se nota sobre todo al entrar y salir de la sección.
          gsap.fromTo(
            '.generator-visual',
            { yPercent: -3.5, scale: 1.07 },
            {
              yPercent: 3.5,
              scale: 1.015,
              ease: 'none',
              scrollTrigger: {
                trigger: escenario ?? generador,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.9,
              },
            },
          );

          // Reflejo que cruza la placa del logo, en loop mientras se ve.
          if (brilloPlaca) {
            gsap.set(brilloPlaca, { rotation: 8 });
            const barridoPlaca = gsap
              .timeline({ repeat: -1, repeatDelay: 4, paused: true })
              .fromTo(
                brilloPlaca,
                { xPercent: -170, opacity: 0 },
                { xPercent: 170, opacity: 1, duration: 1.15, ease: 'power2.inOut' },
              )
              .to(brilloPlaca, { opacity: 0, duration: 0.25 }, '-=0.25');

            ScrollTrigger.create({
              trigger: generador,
              start: 'top bottom',
              end: 'bottom top',
              onToggle: (self) => (self.isActive ? barridoPlaca.play() : barridoPlaca.pause()),
            });
          }

          // Destello que recorre el marco del equipo cada tanto: le da el
          // "acabado" metálico al producto.
          if (destelloMarco) {
            gsap.set(destelloMarco, { rotation: 12 });
            const barridoMarco = gsap
              .timeline({ repeat: -1, repeatDelay: 5.5, paused: true })
              .fromTo(
                destelloMarco,
                { xPercent: -180, opacity: 0 },
                { xPercent: 180, opacity: 1, duration: 1.7, ease: 'power2.inOut' },
              )
              .to(destelloMarco, { opacity: 0, duration: 0.4 }, '-=0.4');

            ScrollTrigger.create({
              trigger: generador,
              start: 'top bottom',
              end: 'bottom top',
              onToggle: (self) => (self.isActive ? barridoMarco.play() : barridoMarco.pause()),
            });
          }

          // El reflejo grande del fondo se desplaza con el scroll.
          gsap.to('.generator-metal__sheen', {
            xPercent: 7,
            yPercent: 4,
            ease: 'none',
            scrollTrigger: {
              trigger: generador,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1,
            },
          });

          // Los halos respiran muy lento: le dan vida al metal sin distraer.
          gsap.to('.generator-metal__glow--gold', {
            x: 40,
            y: 30,
            duration: 14,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          });
        }
      }

      // 9. Carrusel de Aliados Tecnológicos — el conjunto entra en bloque
      // tecnologías, se anima el contenedor completo (las tarjetas ya
      // están en movimiento continuo, no tiene sentido escalonarlas).
      gsap.from('.allies-carousel', {
        scrollTrigger: {
          trigger: '.allies-carousel',
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
        y: 25,
        opacity: 0,
        duration: 0.75,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
      });

      // 11. Dossier de Proyectos: entra el conjunto con suavidad; cada ficha
      // conserva su scroll-snap y sus imágenes reciben un parallax discreto.
      gsap.from('.projects-carousel', {
        scrollTrigger: {
          trigger: '.projects-carousel',
          start: 'top 82%',
          toggleActions: 'play none none none',
        },
        y: 26,
        opacity: 0,
        duration: 0.85,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
      });

      // Parallax dentro del desplazamiento horizontal nativo de la galería.
      // Conserva el scroll-snap y el gesto táctil, sin fijar la página ni
      // convertir el scroll vertical en un desplazamiento lateral forzado.
      if (!this.prefersReducedMotion) {
        const proyectosHost = this.el.nativeElement as HTMLElement;
        const proyectosViewport = proyectosHost.querySelector('.projects-carousel__viewport') as HTMLElement | null;
        proyectosViewport?.querySelectorAll('.project-card').forEach((card: Element) => {
          const image = card.querySelector('.project-card__image') as HTMLElement | null;
          if (!image) return;

          gsap.fromTo(
            image,
            { scale: 1.07, xPercent: -2 },
            {
              scale: 1.015,
              xPercent: 2,
              ease: 'none',
              scrollTrigger: {
                trigger: card,
                scroller: proyectosViewport,
                horizontal: true,
                start: 'left right',
                end: 'right left',
                scrub: 0.8,
                invalidateOnRefresh: true,
              },
            },
          );
        });
      }

      // 12. Razones de Confianza (Por qué NOVAXIS): cada fila entra
      // deslizándose desde el costado mientras su línea divisoria se
      // "dibuja" (se anima la variable CSS --line, que el .scss usa como
      // scaleX del ::after). clearProps devuelve el control al CSS al
      // terminar (evita que el inline tape cambios de estilo en caliente).
      gsap.fromTo(
        '#porque .porque-list__item',
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.12,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '#porque .porque-list',
            start: 'top 82%',
            toggleActions: 'play none none none',
          },
          clearProps: 'opacity,transform,--line',
        },
      );

      // 12b. Pop de los íconos, un instante después de cada fila (mismo
      // criterio que tenía el numeral grande de "Servicios").
      gsap.from('#porque .porque-list__icon', {
        scrollTrigger: {
          trigger: '#porque .porque-list',
          start: 'top 82%',
          toggleActions: 'play none none none',
        },
        scale: 0.5,
        opacity: 0,
        delay: 0.15,
        stagger: 0.12,
        duration: 0.6,
        ease: 'back.out(1.8)',
        clearProps: 'opacity,transform',
      });

      // 13. Contacto por oficina: una línea se dibuja sobre las fichas, estas
      // entran en cascada y luego sube el panel del formulario. Los cambios
      // de oficina se animan aparte (ver animarCambioOficina).
      if (!this.prefersReducedMotion) {
        const contactoTl = gsap.timeline({
          scrollTrigger: {
            trigger: '.office-grid-wrap',
            start: 'top 82%',
            toggleActions: 'play none none none',
          },
        });
        contactoTl
          .fromTo(
            '.office-grid__line',
            { scaleX: 0 },
            { scaleX: 1, duration: 1.1, ease: 'power3.inOut', transformOrigin: 'left center' },
          )
          .from(
            '.office-card',
            {
              y: 42,
              opacity: 0,
              stagger: 0.14,
              duration: 0.85,
              ease: 'power3.out',
              clearProps: 'opacity,transform',
            },
            0.15,
          )
          .from(
            '.office-card__flag',
            { scale: 0.6, opacity: 0, stagger: 0.14, duration: 0.6, ease: 'back.out(1.8)', clearProps: 'opacity,transform' },
            0.4,
          );

      }

      // 14. Efecto de Inclinación 3D en Hover para Pantallas Grandes
      if (!this.prefersReducedMotion && window.matchMedia('(min-width: 1024px)').matches) {
        this.initCardTilt();
      }
    }, this.el.nativeElement);
  }

  // Pausa las animaciones infinitas del hero (sello flotante, beams de
  // atmósfera) cuando la sección sale del viewport, para no gastar CPU/batería
  // con el usuario scrolleado en otra parte de la página.
  private iniciarObservadorHero(): void {
    if (this.prefersReducedMotion || this.heroLoopTweens.length === 0) return;

    const heroSection = this.el.nativeElement.querySelector('#hero');
    if (!heroSection) return;

    const syncHeroAnimations = () => {
      const bounds = heroSection.getBoundingClientRect();
      const visibleWidth = Math.max(0, Math.min(bounds.right, window.innerWidth) - Math.max(bounds.left, 0));
      const visibleHeight = Math.max(0, Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0));
      const visibleRatio = bounds.width * bounds.height > 0
        ? (visibleWidth * visibleHeight) / (bounds.width * bounds.height)
        : 0;
      this.heroLoopTweens.forEach((tween) => (visibleRatio >= 0.1 ? tween.play() : tween.pause()));
    };

    this.observer = new IntersectionObserver(syncHeroAnimations, { threshold: 0.1 });
    syncHeroAnimations();
    this.observer.observe(heroSection);
  }

  // Prende/apaga la clase que corre la línea de escaneo de la sección
  // nuclear — igual criterio que el hero: no gastar ciclos con la sección
  // fuera de pantalla. La propia clase CSS ya respeta reduced-motion.
  private iniciarObservadorNuclear(): void {
    const nuclearSection = this.el.nativeElement.querySelector('#nuclear');
    if (!nuclearSection) return;

    this.nuclearObserver = new IntersectionObserver(
      ([entry]) => {
        nuclearSection.classList.toggle('is-visible', entry.isIntersecting);
      },
      { threshold: 0.15 },
    );
    this.nuclearObserver.observe(nuclearSection);
  }

  // Detecta qué tarjeta está más visible dentro del viewport horizontal
  // del carrusel de proyectos, para mantener sincronizado el dot activo
  // tanto si se navega con las flechas como arrastrando/scrolleando a mano.
  private proyectosRatios: Record<number, number> = {};

  private iniciarObservadorProyectos(): void {
    const viewport: HTMLElement | null = this.el.nativeElement.querySelector('.projects-carousel__viewport');
    const seccion: HTMLElement | null = this.el.nativeElement.querySelector('#proyectos');
    if (!viewport || !seccion) return;

    const tarjetas = Array.from(viewport.querySelectorAll<HTMLElement>('.project-card'));
    if (!tarjetas.length) return;

    this.proyectosObserver = new IntersectionObserver(
      () => {
        const viewportRect = viewport.getBoundingClientRect();
        tarjetas.forEach((tarjeta) => {
          const indice = Number(tarjeta.dataset['indice']);
          const tarjetaRect = tarjeta.getBoundingClientRect();
          const visible = Math.max(
            0,
            Math.min(tarjetaRect.right, viewportRect.right) - Math.max(tarjetaRect.left, viewportRect.left),
          );
          this.proyectosRatios[indice] = tarjetaRect.width ? visible / tarjetaRect.width : 0;
        });

        let mejorIndice = this.proyectoActivo();
        let mejorRatio = 0;
        for (const [indice, ratio] of Object.entries(this.proyectosRatios)) {
          if (ratio > mejorRatio) {
            mejorRatio = ratio;
            mejorIndice = Number(indice);
          }
        }
        if (mejorRatio > 0 && mejorIndice !== this.proyectoActivo()) {
          this.proyectoActivo.set(mejorIndice);
          this.reiniciarAvanceProyectos();
        }
      },
      { root: viewport, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    tarjetas.forEach((tarjeta) => this.proyectosObserver!.observe(tarjeta));

    window.addEventListener('scroll', this.onProyectosViewportChange, { passive: true });
    window.addEventListener('resize', this.onProyectosViewportChange);
    this.onProyectosViewportChange();
  }

  irAProyecto(n: number): void {
    const viewport: HTMLElement | null = this.el.nativeElement.querySelector('.projects-carousel__viewport');
    if (!viewport) return;

    const tarjeta = viewport.querySelector<HTMLElement>(`[data-indice="${n}"]`);
    if (!tarjeta) return;

    this.proyectoActivo.set(n);
    viewport.scrollTo({
      left: tarjeta.offsetLeft - viewport.offsetLeft,
      behavior: this.prefersReducedMotion ? 'auto' : 'smooth',
    });
    this.reiniciarAvanceProyectos();
  }

  moverProyecto(direccion: number): void {
    const indiceActual = this.proyectosIndices.indexOf(this.proyectoActivo());
    const siguienteIndice = (indiceActual + direccion + this.proyectosIndices.length) % this.proyectosIndices.length;
    this.irAProyecto(this.proyectosIndices[siguienteIndice]);
  }

  pausarProyectos(): void {
    this.proyectosPunteroDentro = true;
    this.actualizarPausaProyectos();
  }

  reanudarProyectos(): void {
    this.proyectosPunteroDentro = false;
    this.actualizarPausaProyectos();
  }

  enfocarProyectos(): void {
    this.proyectosEnfocados = true;
    this.actualizarPausaProyectos();
  }

  salirEnfoqueProyectos(event: FocusEvent): void {
    const carrusel = event.currentTarget;
    if (carrusel instanceof HTMLElement && event.relatedTarget instanceof Node && carrusel.contains(event.relatedTarget)) return;

    this.proyectosEnfocados = false;
    this.actualizarPausaProyectos();
  }

  alternarPausaProyectos(): void {
    this.proyectosPausaManual = !this.proyectosPausaManual;
    this.actualizarPausaProyectos();
  }

  private actualizarPausaProyectos(): void {
    const pausado = this.proyectosPausaManual || this.proyectosPunteroDentro || this.proyectosEnfocados;
    this.proyectosPausados.set(pausado);
    this.actualizarAutoplayProyectos();
  }

  private actualizarAutoplayProyectos(): void {
    if (this.proyectosPausados() || !this.proyectosEnVista || this.prefersReducedMotion) {
      this.proyectoProgressTween?.pause();
      return;
    }

    if (this.proyectoProgressTween) this.proyectoProgressTween.resume();
    else this.reiniciarAvanceProyectos();
  }

  private reiniciarAvanceProyectos(): void {
    this.proyectoProgressTween?.kill();
    this.proyectoProgressTween = null;

    const host: HTMLElement = this.el.nativeElement;
    const progressBars = host.querySelectorAll<HTMLElement>('.projects-timeline__progress');
    progressBars.forEach((bar) => gsap.set(bar, { scaleX: 0, transformOrigin: 'left center' }));

    if (this.proyectosPausados() || !this.proyectosEnVista || this.prefersReducedMotion) return;

    const progress = host.querySelector<HTMLElement>(
      `.projects-timeline__progress[data-indice="${this.proyectoActivo()}"]`,
    );
    if (!progress) return;

    this.proyectoProgressTween = gsap.to(progress, {
      scaleX: 1,
      duration: 6,
      ease: 'none',
      onComplete: () => this.moverProyecto(1),
    });
  }

  private initCardTilt(): void {
    const host = this.el.nativeElement;
    if (!host) return;

    const cards = host.querySelectorAll('.feature-card');

    cards.forEach((element: Element) => {
      const card = element as HTMLElement;
      const rotateXTo = gsap.quickTo(card, 'rotationX', { duration: 0.35, ease: 'power1.out' });
      const rotateYTo = gsap.quickTo(card, 'rotationY', { duration: 0.35, ease: 'power1.out' });
      gsap.set(card, { transformPerspective: 1000 });

      const onMouseMove = (e: MouseEvent): void => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;

        rotateXTo(rotateX);
        rotateYTo(rotateY);
      };

      const onMouseLeave = (): void => {
        rotateXTo(0);
        rotateYTo(0);
      };

      card.addEventListener('mousemove', onMouseMove);
      card.addEventListener('mouseleave', onMouseLeave);
      this.cardTiltCleanups.push(() => {
        card.removeEventListener('mousemove', onMouseMove);
        card.removeEventListener('mouseleave', onMouseLeave);
        gsap.killTweensOf(card);
      });
    });
  }

  // ---------------------------------------------------------------
  // Contacto por oficina. Las sedes comparten el correo corporativo hasta
  // que se confirmen buzones locales; solo se publican teléfonos verificados.
  // ---------------------------------------------------------------
  readonly oficinas: OficinaContacto[] = [
    {
      id: 'tunez',
      codigoISO: 'tn',
      nombreKey: 'mapa.paises.tunez.nombre',
      rolKey: 'contacto.rol_matriz',
      empresa: 'NOVAXIS International',
      direccion: null,
      telefono: null,
      telefonoHref: null,
      email: this.emailContacto,
      esMatriz: true,
    },
    {
      id: 'nueva_york',
      codigoISO: 'us',
      nombreKey: 'mapa.paises.nueva_york.nombre',
      rolKey: 'contacto.rol_oficina',
      empresa: 'NOVAXIS NY',
      direccion: '4207 NY30, Amsterdam, NY 12010',
      telefono: '+1 518 391 3180',
      telefonoHref: '+15183913180',
      email: this.emailContacto,
      esMatriz: false,
    },
    {
      id: 'bolivia',
      codigoISO: 'bo',
      nombreKey: 'mapa.paises.bolivia.nombre',
      rolKey: 'contacto.rol_latam',
      empresa: 'NOVAXIS Bolivia', // TODO(cliente): confirmar razón social
      direccion: null, // TODO(cliente): dirección (se oculta mientras sea null)
      telefono: null,
      telefonoHref: null,
      email: this.emailContacto,
      esMatriz: false,
    },
  ];

  private iniciarCarrusel(): void {
    if (this.carruselTimer) clearInterval(this.carruselTimer);
    if (this.prefersReducedMotion) return; // navegación solo manual, sin autoplay
    this.carruselTimer = setInterval(() => {
      if (!this.carruselPausado()) {
        this.slideActual.set((this.slideActual() + 1) % this.slidesHero.length);
      }
    }, 7500);
  }

  irASlide(indice: number): void {
    this.slideActual.set(indice);
    this.iniciarCarrusel();
  }

  /**
   * Una imagen no cargó. Si tiene `data-fallback` se prueba esa una sola vez (se borra el
   * atributo para no entrar en bucle si el respaldo también falla); si no, se marca como
   * fallida y el CSS muestra el fondo de la tarjeta en su lugar, en vez de un hueco vacío.
   */
  alFallarImagen(evento: Event): void {
    const img = evento.target;
    if (!(img instanceof HTMLImageElement)) return;

    const respaldo = img.dataset['fallback'];
    if (respaldo) {
      delete img.dataset['fallback'];
      img.src = respaldo;
      return;
    }
    img.classList.add('is-failed');
  }

  // Con hidratación, una imagen puede fallar antes de que Angular enganche (error): se revisan
  // las que ya terminaron de cargar sin dimensiones.
  private revisarImagenesRotas(): void {
    this.el.nativeElement.querySelectorAll('img[data-fallback]').forEach((img: HTMLImageElement) => {
      if (img.complete && img.naturalWidth === 0 && img.currentSrc) {
        this.alFallarImagen({ target: img } as unknown as Event);
      }
    });
  }

  marcarImagenHeroLista(indice: number): void {
    this.heroImagesLoaded.update((loaded) => new Set(loaded).add(indice));
  }

  marcarImagenHeroError(indice: number): void {
    this.heroImagesError.update((failed) => new Set(failed).add(indice));
  }

  pausarCarrusel(): void {
    this.carruselPausado.set(true);
  }

  reanudarCarrusel(): void {
    this.carruselPausado.set(false);
  }
}
