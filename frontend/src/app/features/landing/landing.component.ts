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
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'app-landing',
  imports: [FormsModule, TranslatePipe, MapaMundialComponent, CountUpDirective],
  templateUrl: './landing.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private observer: IntersectionObserver | null = null;
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  estadoEnvio = signal<'idle' | 'enviando' | 'exito' | 'error'>('idle');
  carruselPausado = signal(false);

  slidesHero = [
    {
      id: 1,
      imagen:
        'https://images.pexels.com/photos/5650141/pexels-photo-5650141.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop',
      labelKey: 'hero.slide1_label',
      subKey: 'hero.slide1_sub',
    },
    {
      id: 2,
      imagen:
        'https://images.pexels.com/photos/7522609/pexels-photo-7522609.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop',
      labelKey: 'hero.slide2_label',
      subKey: 'hero.slide2_sub',
    },
    {
      id: 3,
      imagen:
        'https://images.pexels.com/photos/37564550/pexels-photo-37564550.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop',
      labelKey: 'hero.slide3_label',
      subKey: 'hero.slide3_sub',
    },
    {
      id: 4,
      imagen:
        'https://images.pexels.com/photos/30481728/pexels-photo-30481728.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop',
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

  nosotrosAreas = [
    'nosotros.area1',
    'nosotros.area2',
    'nosotros.area3',
    'nosotros.area4',
    'nosotros.area5',
    'nosotros.area6',
    'nosotros.area7',
    'nosotros.area8',
    'nosotros.area9',
    'nosotros.area10',
  ];

  aliados = [
    'Genetec',
    'Bosch',
    'Axis Communications',
    'HID Global',
    'IDEMIA',
    'Commend',
    'Belden',
    'APC',
    'Ruijie Networks',
  ];

  porqueItems = [
    { titulo: 'porque.item1_title', desc: 'porque.item1_desc' },
    { titulo: 'porque.item2_title', desc: 'porque.item2_desc' },
    { titulo: 'porque.item3_title', desc: 'porque.item3_desc' },
    { titulo: 'porque.item4_title', desc: 'porque.item4_desc' },
    { titulo: 'porque.item5_title', desc: 'porque.item5_desc' },
    { titulo: 'porque.item6_title', desc: 'porque.item6_desc' },
  ];

  latamPaises = ['latam.pais1', 'latam.pais2', 'latam.pais3'];

  private ctx?: gsap.Context;

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    gsap.registerPlugin(ScrollTrigger);

    this.iniciarCarrusel();
    this.iniciarAnimacionesGsap();
  }

  ngOnDestroy(): void {
    if (this.ctx) {
      this.ctx.revert();
    }
    if (this.carruselTimer) {
      clearInterval(this.carruselTimer);
    }
  }

  private iniciarAnimacionesGsap(): void {
    this.ctx = gsap.context(() => {
      // 1. Entrada Cinemática del Hero (sincronizada con la salida del preloader)
      const hasPreloader = typeof document !== 'undefined' && !!document.querySelector('.preloader-overlay');
      const heroTl = gsap.timeline({
        delay: hasPreloader ? 2.5 : 0.2,
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

      // 2. Micro-animaciones continuas y orgánicas (Atmósfera & Sello)
      gsap.to('.hero-brand-seal', {
        y: -6,
        duration: 3.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.to('.atmosphere-beam--one', {
        x: '+=35',
        y: '-=25',
        rotation: '+=4',
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.to('.atmosphere-beam--two', {
        x: '-=30',
        y: '+=20',
        rotation: '-=3',
        duration: 11,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // 3. Barra de Estadísticas Principal
      gsap.from('.stat-item', {
        scrollTrigger: {
          trigger: '.stats-bar',
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
        y: 30,
        opacity: 0,
        stagger: 0.12,
        duration: 0.8,
        ease: 'power2.out',
      });

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
      });

      // 6. Línea de Tiempo (Hitos de Expansión)
      gsap.from('.timeline li', {
        scrollTrigger: {
          trigger: '.timeline',
          start: 'top 82%',
          toggleActions: 'play none none none',
        },
        y: 30,
        opacity: 0,
        stagger: 0.16,
        duration: 0.8,
        ease: 'power2.out',
      });

      // 7. Tarjetas de Sectores
      gsap.from('.sector-card', {
        scrollTrigger: {
          trigger: '.sector-grid',
          start: 'top 82%',
          toggleActions: 'play none none none',
        },
        y: 40,
        opacity: 0,
        stagger: 0.1,
        duration: 0.85,
        ease: 'power2.out',
      });

      // 8. Sellos de Calidad y Equipo
      gsap.from('.badge-list li', {
        scrollTrigger: {
          trigger: '.badge-list',
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
        scale: 0.92,
        opacity: 0,
        stagger: 0.12,
        duration: 0.7,
        ease: 'back.out(1.5)',
      });

      // 9. Especialidades Tecnológicas
      gsap.from('.tech-card', {
        scrollTrigger: {
          trigger: '.tech-grid',
          start: 'top 82%',
          toggleActions: 'play none none none',
        },
        y: 35,
        opacity: 0,
        stagger: 0.09,
        duration: 0.85,
        ease: 'power2.out',
      });

      // 10. Tira de Aliados Tecnológicos
      gsap.from('.allies-strip li', {
        scrollTrigger: {
          trigger: '.allies-strip',
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
        scale: 0.9,
        opacity: 0,
        stagger: 0.06,
        duration: 0.65,
        ease: 'back.out(1.4)',
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
      });

      // 12. Razones de Confianza (Por qué NOVAXIS)
      gsap.from('#porque .feature-card', {
        scrollTrigger: {
          trigger: '#porque .feature-grid',
          start: 'top 82%',
          toggleActions: 'play none none none',
        },
        y: 35,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: 'power2.out',
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
      if (window.matchMedia('(min-width: 1024px)').matches) {
        this.initCardTilt();
      }
    }, this.el.nativeElement);
  }

  private initCardTilt(): void {
    const host = this.el.nativeElement;
    if (!host) return;

    const cards = host.querySelectorAll(
      '.feature-card, .sector-card, .tech-card, .project-card',
    );

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
    _hp: '',
  };

  enviarContacto(): void {
    if (this.estadoEnvio() === 'enviando') return;

    if (this.contactoForm._hp) {
      this.estadoEnvio.set('exito');
      return;
    }

    this.estadoEnvio.set('enviando');

    setTimeout(() => {
      this.estadoEnvio.set('exito');
      this.contactoForm = {
        nombre: '',
        telefono: '',
        email: '',
        tipoProyecto: '',
        servicio: '',
        mensaje: '',
        _hp: '',
      };
    }, 1200);
  }

  private iniciarCarrusel(): void {
    if (this.carruselTimer) clearInterval(this.carruselTimer);
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

  onCarouselMouseEnter(): void {
    this.carruselPausado.set(true);
  }

  onCarouselMouseLeave(): void {
    this.carruselPausado.set(false);
  }
}
