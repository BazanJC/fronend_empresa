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
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MapaMundialComponent } from '../../shared/mapa-mundial/mapa-mundial.component';
import { CountUpDirective } from '../../shared/count_up.directive';
import { ContactService } from '../../core/contact.service';
import { CLIENT_HERO_IMAGES } from '../../core/site-media';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'app-landing',
  imports: [FormsModule, TranslatePipe, NgTemplateOutlet, MapaMundialComponent, CountUpDirective],
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
  estadoEnvio = signal<'idle' | 'preparado'>('idle');
  correoPreparado = signal<string | null>(null);
  carruselPausado = signal(false);
  paisDestacado = signal<string | null>(null);
  paisLatamHovered = signal<string | null>(null);
  paisLatamSeleccionado = signal<string | null>(null);
  paisLatamActivo = computed(() => this.paisLatamHovered() ?? this.paisLatamSeleccionado());
  generadorSpecHovered = signal<string | null>(null);
  generadorSpecSeleccionado = signal<string | null>(null);
  generadorSpecActiva = computed(() => this.generadorSpecHovered() ?? this.generadorSpecSeleccionado());

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

  paisesPresencia = [
    { id: 'tunez', codigoISO: 'tn', anio: 2009, proyectos: 2 },
    { id: 'bolivia', codigoISO: 'bo', anio: 2025, proyectos: 1 },
    { id: 'panama', codigoISO: 'pa', anio: 2022, proyectos: null },
    { id: 'honduras', codigoISO: 'hn', anio: 2026, proyectos: 1 },
    { id: 'guinea_bissau', codigoISO: 'gw', anio: 2017, proyectos: 1 },
    { id: 'sri_lanka', codigoISO: 'lk', anio: 2018, proyectos: 1 },
    { id: 'libia', codigoISO: 'ly', anio: 2019, proyectos: 1 },
    { id: 'mauritania', codigoISO: 'mr', anio: 2023, proyectos: 1 },
    { id: 'ucrania', codigoISO: 'ua', anio: 2024, proyectos: 1 },
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
    'https://images.pexels.com/photos/11288661/pexels-photo-11288661.jpeg?auto=compress&cs=tinysrgb&w=900&h=540&fit=crop', // 8. Centro médico de radioterapia; Pexels: https://www.pexels.com/photo/a-room-with-radiotherapy-for-cancer-treatment-11288661/
    'https://images.pexels.com/photos/37591149/pexels-photo-37591149.jpeg?auto=compress&cs=tinysrgb&w=900&h=540&fit=crop', // 9. Cámara de seguridad en infraestructura urbana; Pexels: https://www.pexels.com/photo/outdoor-surveillance-camera-on-building-wall-37591149/
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

  // Fusión con lo que antes era la sección "Tecnologías" — mismas 6
  // Ninguna de estas imágenes se repite con las del carrusel del hero.
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
  ];

  // Duplicado para que el carrusel automático (ver .tech-carousel en el
  // .scss) pueda hacer un loop perfecto trasladando exactamente -50%, sin
  // salto visible en la costura.
  tecnologiasCardsLoop = [...this.tecnologiasCards, ...this.tecnologiasCards];

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

  // Duplicado para el loop continuo del carrusel (mismo criterio que
  // tecnologiasCardsLoop).
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
    { id: 'panama', codigoISO: 'pa', nombreKey: 'latam.pais2_nombre', estadoKey: 'latam.pais2_estado', esSede: false, silueta: 'M90.414 46.257 88.617 48.419 92 57.158 89.251 61.573 84.546 60.495 82.643 67.689 77.727 63.429 74.608 55.427 78.203 51.459 74.502 50.454 71.753 45.528 64.458 41.403 58.009 42.359 55.048 47.514 49.128 51.258 45.903 51.761 44.476 54.849 51.454 62.902 47.489 64.807 45.374 66.987 38.502 67.739 35.965 58.89 34.062 61.423 29.198 60.545 26.238 54.573 20.211 53.594 16.405 51.861 10.115 51.886 9.692 55.1 8 52.866 8.74 49.927 9.956 46.911 9.427 44.221 11.595 42.46 8.529 40.245 8.476 34.252 14.132 32.916 19.419 38.257 19.101 41.428 24.969 42.082 26.344 40.875 30.414 44.522 37.604 43.466 43.894 39.692 52.775 36.695 57.797 32.261 65.885 33.118 65.357 34.579 73.551 35.109 80.106 37.678 84.863 42.133Z' },
    { id: 'honduras', codigoISO: 'hn', nombreKey: 'latam.pais3_nombre', estadoKey: 'latam.pais3_estado', esSede: false, silueta: 'M92 43.049 87.371 42.764 85.52 44.684 80.794 46.509 77.383 46.509 74.411 48.309 71.682 47.669 69.392 45.538 67.979 45.94 66.225 49.279 64.91 49.161 64.715 52.023 59.988 55.875 57.503 57.528 56.09 59.274 52.095 56.442 49.172 60.171 46.346 60.076 43.179 60.407 43.471 67.239 41.473 67.356 39.768 70.532 35.578 71.12 33.239 66.768 29.146 65.567 30.072 59.982 28.22 58.472 25.443 57.481 19.499 59.133 19.012 57.268 14.919 55.025 11.995 52.236 8 51.054 10.826 47.504 9.754 44.756 10.729 42.076 17.111 38.135 23.299 32.786 24.712 33.333 27.684 30.857 31.534 30.667 32.8 31.81 34.896 31.119 41.181 32.381 47.418 32.024 51.803 30.453 53.362 28.88 57.698 29.619 60.914 30.572 64.471 30.238 67.151 29.023 73.339 30.976 75.483 31.286 79.624 33.904 83.522 37.043 88.443 39.204Z' },
    { id: 'colombia', codigoISO: 'co', nombreKey: 'latam.pais4_nombre', estadoKey: null, esSede: false, silueta: 'M80.215 64.286 79.281 64.902 78.294 61.954 76.911 60.375 75.259 62.09 65.543 61.98 65.615 65.105 68.524 65.62 68.363 67.528 67.357 67.013 64.555 67.832 64.537 71.463 66.746 73.278 67.519 76.141 67.411 78.303 65.166 92 62.67 89.342 61.179 89.224 64.394 84.133 60.569 81.8 57.588 82.231 55.774 81.361 53.026 82.688 49.309 82.062 46.381 76.825 44.065 75.541 42.466 73.185 39.162 70.821 37.833 71.294 35.696 70.112 33.236 68.465 31.817 69.259 27.597 68.567 26.375 66.414 25.442 66.498 20.449 63.644 19.785 62.098 21.634 61.726 21.419 59.226 22.586 57.417 25.064 57.079 27.166 53.942 29.069 51.32 27.237 50.126 28.171 47.222 27.058 42.644 28.117 41.329 27.327 37.082 25.316 34.402 25.962 31.958 27.561 32.325 28.495 30.825 27.345 27.856 27.956 27.122 30.524 27.275 34.277 23.754 36.325 23.214 36.378 21.545 37.294 17.255 40.15 14.9 43.292 14.805 43.688 13.746 47.603 14.168 51.518 11.601 53.475 10.462 55.881 8 57.641 8.311 58.952 9.659 57.983 11.376 54.786 12.23 53.511 14.771 51.589 16.224 50.135 18.114 49.524 21.733 48.141 24.686 50.727 25.028 51.356 27.344 52.469 28.454 52.846 30.484 52.254 32.35 52.433 33.398 53.673 33.815 54.858 35.577 61.269 35.092 64.16 35.73 67.68 40.047 69.692 39.512 73.283 39.784 76.121 39.206 77.899 40.072 77.001 42.771 75.887 44.459 75.492 48.043 76.498 51.37 77.917 52.851 78.078 53.976 75.564 56.462 77.36 57.561 78.689 59.31Z' },
  ];

  paisLatamActivoItem = computed(() => this.latamPaises.find((pais) => pais.id === this.paisLatamActivo()) ?? null);

  generadorSpecs = [
    { id: 'power', titleKey: 'generador.spec_power', valueKey: 'generador.power_value', side: 'right' },
    { id: 'electrical', titleKey: 'generador.spec_electrical', valueKey: 'generador.electrical_value', side: 'left' },
    { id: 'engine', titleKey: 'generador.spec_engine', valueKey: 'generador.engine_value', side: 'right' },
    { id: 'controller', titleKey: 'generador.spec_controller', valueKey: 'generador.controller_value', side: 'right' },
    { id: 'fuel', titleKey: 'generador.spec_fuel', valueKey: 'generador.fuel_value', side: 'left' },
    { id: 'testing', titleKey: 'generador.spec_testing', valueKey: 'generador.testing_value', side: 'left' },
  ];

  generadorSpecActivaItem = computed(() => this.generadorSpecs.find((spec) => spec.id === this.generadorSpecActiva()) ?? null);

  activarGeneradorSpec(id: string): void {
    if (this.generadorSpecActiva() === id) return;
    const anterior = this.generadorSpecActiva();
    this.generadorSpecHovered.set(id);
    this.animarTooltipGenerador(anterior, id);
  }

  salirGeneradorSpec(id: string): void {
    if (this.generadorSpecHovered() !== id) return;
    const anterior = this.generadorSpecActiva();
    this.generadorSpecHovered.set(null);
    this.animarTooltipGenerador(anterior, this.generadorSpecActiva());
  }

  seleccionarGeneradorSpec(id: string): void {
    const anterior = this.generadorSpecActiva();
    this.generadorSpecSeleccionado.set(this.generadorSpecSeleccionado() === id ? null : id);
    this.animarTooltipGenerador(anterior, this.generadorSpecActiva());
  }

  private animarTooltipGenerador(anterior: string | null, actual: string | null): void {
    if (this.prefersReducedMotion) return;
    requestAnimationFrame(() => {
      const stage = (this.el.nativeElement as HTMLElement).querySelector<HTMLElement>('.generator-stage');
      const tooltipAnterior = anterior
        ? stage?.querySelector<HTMLElement>(`[data-spec-tooltip="${anterior}"]`)
        : null;
      const tooltipActual = actual
        ? stage?.querySelector<HTMLElement>(`[data-spec-tooltip="${actual}"]`)
        : null;

      if (tooltipAnterior && tooltipAnterior !== tooltipActual) {
        gsap.killTweensOf(tooltipAnterior);
        gsap.to(tooltipAnterior, { autoAlpha: 0, y: 5, duration: 0.2, ease: 'power2.out' });
      }
      if (tooltipActual) {
        gsap.killTweensOf(tooltipActual);
        gsap.fromTo(tooltipActual,
          { autoAlpha: 0, y: 9, scale: 0.98, filter: 'blur(3px)' },
          { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.38, ease: 'power2.out' },
        );
      }
    });
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

  expansionHitos = [
    { anio: '2009', tituloKey: 'expansion.item1_title', descKey: 'expansion.item1_desc' },
    { anio: '2017-2019', tituloKey: 'expansion.item2_title', descKey: 'expansion.item2_desc' },
    { anio: '2021-2024', tituloKey: 'expansion.item3_title', descKey: 'expansion.item3_desc' },
    { anio: '2025-2026', tituloKey: 'expansion.item4_title', descKey: 'expansion.item4_desc' },
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
          .from('.hero-title', { y: 32, opacity: 0, duration: 1.1 })
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

      // 5. Cascada de Tarjetas de Servicios
      gsap.from('#servicios .feature-card', {
        scrollTrigger: {
          trigger: '#servicios .feature-grid',
          start: 'top 82%',
          toggleActions: 'play none none none',
        },
        y: 40,
        opacity: 0,
        stagger: 0.15,
        duration: 0.85,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
      });

      // 5b. Numeral grande de cada tarjeta: entra con un pequeño "pop" justo
      // después de la tarjeta, para que se note el peso/orden de cada servicio.
      // clearProps: al terminar, GSAP borra el opacity/transform inline que
      // dejó pegado en el elemento — sin esto, un hot-reload de SOLO estilos
      // (guardar el .scss sin recompilar el componente) queda "tapado" por
      // el inline viejo y el número no refleja el nuevo valor hasta recargar
      // la página entera.
      gsap.from('#servicios .feature-index', {
        scrollTrigger: {
          trigger: '#servicios .feature-grid',
          start: 'top 82%',
          toggleActions: 'play none none none',
        },
        scale: 0.6,
        opacity: 0,
        delay: 0.2,
        stagger: 0.15,
        duration: 0.7,
        ease: 'back.out(1.6)',
        clearProps: 'opacity,transform',
      });

      // 5c. Tarjetas de presencia regional: entrada editorial con cascada
      // breve. El contenido permanece visible si el usuario reduce movimiento.
      gsap.from('.latam-countries li', {
        scrollTrigger: {
          trigger: '.latam-countries',
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        y: 28,
        opacity: 0,
        scale: 0.97,
        stagger: 0.12,
        duration: 0.72,
        ease: 'power3.out',
        clearProps: 'opacity,transform',
      });

      // 6. Línea de Tiempo (Hitos de Expansión): scroll pineado horizontal.
      // La sección se queda fija en pantalla (pin: true) y el scroll vertical
      // normal empuja .timeline-track hacia la izquierda — el usuario sigue
      // haciendo scroll hacia abajo como siempre, pero visualmente el
      // contenido avanza de lado a lado, un panel/hito a la vez.
      // Se conserva el recorrido horizontal en escritorio. El layout reduce
      // su altura y espaciado en pantallas bajas para seguir bajo el header.
      const timelinePin = this.el.nativeElement.querySelector('.expansion-pin') as HTMLElement | null;
      const timelineTrack = this.el.nativeElement.querySelector('.timeline-track') as HTMLElement | null;
      const timelinePanels = gsap.utils.toArray<HTMLElement>('.timeline-panel');
      const timelineDots = gsap.utils.toArray<HTMLElement>('.timeline-dots__dot');
      const alturaHeaderFijo = 92;

      if (timelinePin && timelineTrack && timelinePanels.length > 1 && !this.prefersReducedMotion && window.matchMedia('(min-width: 901px)').matches) {
        if (timelineDots[0]) timelineDots[0].classList.add('is-active');

        gsap.to(timelineTrack, {
          x: () => -(timelineTrack.scrollWidth - timelinePin.offsetWidth),
          ease: 'none',
          scrollTrigger: {
            trigger: timelinePin,
            start: 'top top+=' + alturaHeaderFijo,
            end: () => '+=' + (timelineTrack.scrollWidth - timelinePin.offsetWidth),
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const indiceActivo = Math.round(self.progress * (timelinePanels.length - 1));
              timelineDots.forEach((dot, i) => dot.classList.toggle('is-active', i === indiceActivo));
            },
          },
        });
      } else {
        // Fallback: mobile o reduced-motion — sin pin ni movimiento
        // horizontal, todo apilado y visible con un fade simple de entrada.
        timelinePin?.classList.add('no-pin');
        gsap.from('#expansion .timeline-panel', {
          scrollTrigger: {
            trigger: '#expansion .timeline-track',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          y: 30,
          opacity: 0,
          stagger: 0.16,
          duration: 0.8,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
        });
      }

      // 6b. Gráfico de ruta "De Gabès al Mundo": se revela progresivamente
      // (máscara SVG que crece en ancho) mientras se hace scroll por la
      // sección, y tiene un leve parallax propio. Respeta reduced-motion
      // como el resto de los parallax del sitio.
      const rutaMask = this.el.nativeElement.querySelector('.expansion-route__mask-rect') as SVGRectElement | null;
      if (rutaMask && !this.prefersReducedMotion) {
        gsap.to(rutaMask, {
          attr: { width: 420 },
          ease: 'none',
          scrollTrigger: {
            trigger: '#expansion',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.6,
          },
        });

        gsap.to('.expansion-route', {
          y: -30,
          x: 15,
          scrollTrigger: {
            trigger: '#expansion',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        });
      }

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
        { clipPath: 'inset(0 0 0 100% round 1.15rem)', opacity: 0 },
        {
          clipPath: 'inset(0 0 0 0% round 1.15rem)',
          opacity: 1,
          stagger: 0.12,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.nuclear-grid',
            start: 'top 85%',
            toggleActions: 'play reverse play reverse',
          },
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

      // 8b. Presentación de producto: el generador entra como pieza principal
      // y los puntos técnicos aparecen después con una cascada contenida.
      if (!this.prefersReducedMotion) {
        gsap.from('.generator-visual', {
          scrollTrigger: {
            trigger: '.generator-stage',
            start: 'top 82%',
            toggleActions: 'play none none none',
          },
          y: 22,
          opacity: 0,
          scale: 0.985,
          duration: 0.9,
          ease: 'power3.out',
          clearProps: 'opacity,transform',
        });
        gsap.from('.generator-hotspot', {
          scrollTrigger: {
            trigger: '.generator-stage',
            start: 'top 82%',
            toggleActions: 'play none none none',
          },
          scale: 0.55,
          opacity: 0,
          stagger: 0.09,
          duration: 0.48,
          ease: 'back.out(1.5)',
          clearProps: 'opacity,transform',
        });
      }

      // 9. Especialidades Tecnológicas — el carrusel se mueve solo (CSS),
      // así que acá solo se anima la entrada del contenedor completo, no
      // tarjeta por tarjeta (no tendría sentido escalonar algo que ya
      // está en movimiento continuo).
      gsap.from('.tech-carousel', {
        scrollTrigger: {
          trigger: '.tech-carousel',
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        y: 30,
        opacity: 0,
        duration: 0.85,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
      });

      // 10. Carrusel de Aliados Tecnológicos — igual que el de
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

      // 13. Formulario de Contacto
      gsap.from('.contact-form', {
        scrollTrigger: {
          trigger: '.contact-form',
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        y: 35,
        opacity: 0,
        duration: 0.85,
        ease: 'power2.out',
      });

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

  contactoForm = {
    nombre: '',
    telefono: '',
    email: '',
    tipoProyecto: '',
    servicio: '',
    mensaje: '',
  };

  enviarContacto(): void {
    const mailto = this.contactService.crearEnlace({
      nombre: this.contactoForm.nombre.trim(),
      telefono: this.contactoForm.telefono.trim(),
      email: this.contactoForm.email.trim(),
      tipoProyecto: this.contactoForm.tipoProyecto,
      servicio: this.contactoForm.servicio,
      mensaje: this.contactoForm.mensaje.trim(),
    });

    this.correoPreparado.set(mailto);
    this.estadoEnvio.set('preparado');
    window.location.href = mailto;
  }

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

  marcarImagenHeroLista(indice: number): void {
    this.heroImagesLoaded.update((loaded) => new Set(loaded).add(indice));
  }

  marcarImagenHeroError(indice: number): void {
    this.heroImagesError.update((failed) => new Set(failed).add(indice));
  }

  seleccionarProyectoNuclear(): void {
    this.contactoForm.tipoProyecto = 'nuevo';
    this.contactoForm.servicio = 'nuclear';
  }

  pausarCarrusel(): void {
    this.carruselPausado.set(true);
  }

  reanudarCarrusel(): void {
    this.carruselPausado.set(false);
  }
}
