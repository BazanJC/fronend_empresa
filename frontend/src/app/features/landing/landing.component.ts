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
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MapaMundialComponent } from '../../shared/mapa-mundial/mapa-mundial.component';
import { CountUpDirective } from '../../shared/count_up.directive';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, MapaMundialComponent, CountUpDirective],
  templateUrl: './landing.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  private el = inject(ElementRef);
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
    { value: '24/7', labelKey: 'stats.monitoreo', icon: 'monitor' },
    { value: '98%', labelKey: 'stats.efectividad', icon: 'shield' },
    { value: '15+', labelKey: 'stats.paises', icon: 'globe' },
    { value: '200+', labelKey: 'stats.proyectos', icon: 'briefcase' },
  ];

  paisesPresencia = [
    { id: 'bolivia', codigoISO: 'bo', anio: 2021, proyectos: 12 },
    { id: 'honduras', codigoISO: 'hn', anio: 2009, proyectos: 34 },
    { id: 'usa', codigoISO: 'us', anio: 2015, proyectos: 8 },
    { id: 'francia', codigoISO: 'fr', anio: 2018, proyectos: 5 },
    { id: 'elsalvador', codigoISO: 'sv', anio: 2022, proyectos: 6 },
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

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15 },
    );

    const reveals = this.el.nativeElement.querySelectorAll('.reveal');
    reveals.forEach((reveal: Element) => this.observer?.observe(reveal));

    this.iniciarCarrusel();
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.carruselTimer) {
      clearInterval(this.carruselTimer);
    }
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
