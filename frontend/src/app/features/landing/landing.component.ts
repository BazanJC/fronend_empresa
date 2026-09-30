import {
  Component,
  inject,
  AfterViewInit,
  ElementRef,
  OnDestroy,
  signal,
  PLATFORM_ID,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MapaMundialComponent } from '../../shared/mapa-mundial/mapa-mundial.component';
import { CountUpDirective } from '../../shared/count_up.directive';
import { ContactService } from '../../core/contact.service';
import { HERO_COVER_IMAGES } from '../../core/site-media';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'app-landing',
  imports: [FormsModule, TranslatePipe, MapaMundialComponent, CountUpDirective],
  templateUrl: './landing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private contactService = inject(ContactService);
  readonly emailContacto = this.contactService.recipient;
  private observer: IntersectionObserver | null = null;
  private nuclearObserver: IntersectionObserver | null = null;
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private prefersReducedMotion = false;
  private heroLoopTweens: gsap.core.Tween[] = [];
  estadoEnvio = signal<'idle' | 'preparado'>('idle');
  correoPreparado = signal<string | null>(null);
  carruselPausado = signal(false);
  paisDestacado = signal<string | null>(null);

  slidesHero = [
    {
      id: 1,
      imagen: HERO_COVER_IMAGES[0],
      labelKey: 'hero.slide1_label',
      subKey: 'hero.slide1_sub',
    },
    {
      id: 2,
      imagen: HERO_COVER_IMAGES[1],
      labelKey: 'hero.slide2_label',
      subKey: 'hero.slide2_sub',
    },
    {
      id: 3,
      imagen: HERO_COVER_IMAGES[2],
      labelKey: 'hero.slide3_label',
      subKey: 'hero.slide3_sub',
    },
    {
      id: 4,
      imagen: HERO_COVER_IMAGES[3],
      labelKey: 'hero.slide4_label',
      subKey: 'hero.slide4_sub',
    },
  ];

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
    { id: 'panama', codigoISO: 'pa', anio: 2022, proyectos: 1 },
    { id: 'honduras', codigoISO: 'hn', anio: 2026, proyectos: 1 },
  ];

  proyectosIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Fotos de referencia por proyecto (genéricas, temáticamente acordes a
  // cada caso) — el cliente va a reemplazarlas por fotos reales de cada
  // proyecto más adelante. Mismo orden que proyectosIndices.
  proyectosImagenes = [
    'https://images.pexels.com/photos/33984563/pexels-photo-33984563.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', // 1. ONU (UNIOGBIS) Guinea-Bissau
    'https://images.pexels.com/photos/18959229/pexels-photo-18959229.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', // 2. Armada de Sri Lanka
    'https://images.pexels.com/photos/7103169/pexels-photo-7103169.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', // 3. Elecciones - HNEC Libia
    'https://images.pexels.com/photos/5187310/pexels-photo-5187310.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', // 4. Infraestructuras gubernamentales
    'https://images.pexels.com/photos/36566099/pexels-photo-36566099.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', // 5. Infraestructuras estratégicas - Mauritania
    'https://images.pexels.com/photos/29886913/pexels-photo-29886913.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', // 6. Infraestructuras estratégicas - Ucrania
    'https://images.pexels.com/photos/10958528/pexels-photo-10958528.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', // 7. Banco Mundial - Túnez (vidrios)
    'https://images.pexels.com/photos/18335700/pexels-photo-18335700.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', // 8. OIEA/ABEN - Bolivia (nuclear)
    'https://images.pexels.com/photos/31085774/pexels-photo-31085774.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', // 9. PNUD/UNAH - Honduras
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
    { img: 'https://images.pexels.com/photos/427029/pexels-photo-427029.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop', tituloKey: 'tecnologias.card4_title', descKey: 'tecnologias.card4_desc' },
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
    this.razonActiva.set(indice);
  }

  latamPaises = [
    { id: 'bolivia', codigoISO: 'bo', nombreKey: 'latam.pais1_nombre', estadoKey: 'latam.pais1_estado', esSede: true },
    { id: 'panama', codigoISO: 'pa', nombreKey: 'latam.pais2_nombre', estadoKey: 'latam.pais2_estado', esSede: false },
    { id: 'honduras', codigoISO: 'hn', nombreKey: 'latam.pais3_nombre', estadoKey: 'latam.pais3_estado', esSede: false },
  ];

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

  ngAfterViewInit(): void {
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
            '.hero-tagline',
            '.hero-subtitle',
            '.hero-actions .btn-primary, .hero-actions .btn-secondary',
            '.hero-visual',
            '.hero-brand-seal',
          ],
          { opacity: 1, y: 0, scale: 1, rotation: 0, clearProps: 'transform' },
        );
      } else {
        const heroTl = gsap.timeline({
          delay: hasPreloader ? 1.05 : 0.2,
          defaults: { ease: 'power3.out' },
        });
        heroTl
          .from('.hero-title', { y: 40, opacity: 0, duration: 1.1 })
          .from('.hero-tagline', { y: 20, opacity: 0, duration: 0.8 }, '-=0.7')
          .from('.hero-subtitle', { y: 25, opacity: 0, duration: 0.9 }, '-=0.6')
          .from('.hero-actions .btn-primary, .hero-actions .btn-secondary', {
            y: 20,
            opacity: 0,
            stagger: 0.15,
            duration: 0.7,
            ease: 'back.out(1.4)',
          }, '-=0.5')
          .from('.hero-visual', { scale: 0.94, opacity: 0, duration: 1.2, ease: 'expo.out' }, '-=0.9')
          .from('.hero-brand-seal', { scale: 0, rotation: -15, duration: 1, ease: 'back.out(1.8)' }, '-=0.6');
      }

      // 2. Micro-animaciones continuas y orgánicas (Atmósfera & Sello)
      // Se omiten con reduced-motion, y se guardan en heroLoopTweens para
      // poder pausarlas cuando el hero sale del viewport (ver iniciarObservadorHero).
      if (!this.prefersReducedMotion) {
        this.heroLoopTweens.push(
          gsap.to('.hero-brand-seal', {
            y: -6,
            duration: 3.5,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          }),
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

      // 5c. Tarjetas de país de NOVAXIS LATAM: entrada escalonada con pop.
      // Bolivia (sede regional) está primera en el array, así que abre la
      // secuencia como la novedad principal del grupo.
      gsap.from('.latam-countries li', {
        scrollTrigger: {
          trigger: '.latam-countries',
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        y: 30,
        opacity: 0,
        scale: 0.9,
        stagger: 0.15,
        duration: 0.7,
        ease: 'back.out(1.7)',
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

      // 8b. Sellos de Calidad y Equipo — efecto "sello estampado": cae
      // grande, girado, y se asienta con rebote, como si se acabara de
      // estampar sobre la página.
      gsap.from('.badge-list__item', {
        scrollTrigger: {
          trigger: '.badge-list',
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        scale: 1.6,
        rotation: -12,
        opacity: 0,
        stagger: 0.18,
        duration: 0.65,
        ease: 'back.out(1.8)',
        clearProps: 'opacity,transform',
      });

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

      // 11. Carrusel de Proyectos
      gsap.from('.project-card', {
        scrollTrigger: {
          trigger: '.projects-carousel',
          start: 'top 82%',
          toggleActions: 'play none none none',
        },
        x: 40,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
      });

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

    this.observer = new IntersectionObserver(
      ([entry]) => {
        this.heroLoopTweens.forEach((tween) => (entry.isIntersecting ? tween.play() : tween.pause()));
      },
      { threshold: 0.1 },
    );
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
      (entries) => {
        entries.forEach((entry) => {
          const indice = Number((entry.target as HTMLElement).dataset['indice']);
          this.proyectosRatios[indice] = entry.intersectionRatio;
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
      card.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;

        gsap.to(card, {
          rotationX: rotateX,
          rotationY: rotateY,
          transformPerspective: 1000,
          duration: 0.35,
          ease: 'power1.out',
        });
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          rotationX: 0,
          rotationY: 0,
          duration: 0.65,
          ease: 'elastic.out(1, 0.6)',
        });
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