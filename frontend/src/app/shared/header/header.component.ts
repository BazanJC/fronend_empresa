import {
  Component,
  signal,
  inject,
  effect,
  AfterViewInit,
  OnDestroy,
  PLATFORM_ID,
  ViewChildren,
  QueryList,
  ElementRef,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../core/theme.service';
import { LanguageService } from '../../core/language.service';

type TipoLogin = 'cliente' | 'staff';

interface PlataformaOption {
  numero: string;
  tituloKey: string;
  descripcionKey: string;
  ruta: string;
  tipoLogin: TipoLogin;
}

const PLATAFORMA_OPTIONS: PlataformaOption[] = [
  {
    numero: '1',
    tituloKey: 'plataforma.portal_titulo',
    descripcionKey: 'plataforma.portal_desc',
    ruta: 'portal.novaxis-international.com',
    tipoLogin: 'cliente',
  },
  {
    numero: '2',
    tituloKey: 'plataforma.tecnico_titulo',
    descripcionKey: 'plataforma.tecnico_desc',
    ruta: 'tecnico.novaxis-international.com',
    tipoLogin: 'staff',
  },
  {
    numero: '3',
    tituloKey: 'plataforma.admin_titulo',
    descripcionKey: 'plataforma.admin_desc',
    ruta: 'admin.novaxis-international.com',
    tipoLogin: 'staff',
  },
];

const SECCIONES_OBSERVADAS = ['servicios', 'sectores', 'proyectos', 'contacto'];

@Component({
  selector: 'app-header',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  theme = inject(ThemeService);
  language = inject(LanguageService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private observer?: IntersectionObserver;

  @HostListener('document:click', ['$event'])
  onClickFuera(event: MouseEvent): void {
    if (!this.idiomaMenuAbierto()) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.idiomaMenuAbierto.set(false);
    }
  }

  @ViewChildren('navLink') navLinks!: QueryList<ElementRef<HTMLAnchorElement>>;

  menuMovilAbierto = signal(false);
  idiomaMenuAbierto = signal(false);
  platformOptions = PLATAFORMA_OPTIONS;

  seccionActiva = signal<string>('');

  // Posición/ancho/alto del indicador deslizante (la cápsula que se mueve)
  indicadorLeft = signal(0);
  indicadorWidth = signal(0);
  indicadorTop = signal(0);
  indicadorHeight = signal(0);
  indicadorListo = signal(false);

  platformModalOpen = signal(false);
  vistaModal = signal<'seleccion' | 'login'>('seleccion');
  opcionSeleccionada = signal<PlataformaOption | null>(null);

  loginForm = { rx: '', codigoAcceso: '', usuario: '', password: '' };

  constructor() {
    effect(() => {
      const activa = this.seccionActiva();
      if (activa) {
        queueMicrotask(() => this.actualizarIndicador(activa));
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.seccionActiva.set(entry.target.id);
          }
        });
      },
      { rootMargin: '-30% 0px -50% 0px', threshold: 0 },
    );

    SECCIONES_OBSERVADAS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) this.observer!.observe(el);
    });

    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.isBrowser) window.removeEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.actualizarIndicador(this.seccionActiva());
  };

  private actualizarIndicador(idActivo: string): void {
    if (!this.navLinks) return;
    const enlace = this.navLinks.find((ref) => ref.nativeElement.dataset['id'] === idActivo);
    if (!enlace) return;

    const el = enlace.nativeElement;
    this.indicadorLeft.set(el.offsetLeft);
    this.indicadorWidth.set(el.offsetWidth);
    this.indicadorTop.set(el.offsetTop);
    this.indicadorHeight.set(el.offsetHeight);
    this.indicadorListo.set(true);
  }

  seleccionarIdioma(codigo: string): void {
    this.language.cambiarIdioma(codigo);
    this.idiomaMenuAbierto.set(false);
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

  openPlatformModal(): void {
    this.platformModalOpen.set(true);
    this.vistaModal.set('seleccion');
    this.opcionSeleccionada.set(null);
    if (this.isBrowser) document.body.style.overflow = 'hidden';
  }

  closePlatformModal(): void {
    this.platformModalOpen.set(false);
    if (this.isBrowser) document.body.style.overflow = 'auto';
  }

  seleccionarPlataforma(opcion: PlataformaOption): void {
    this.opcionSeleccionada.set(opcion);
    this.vistaModal.set('login');
  }

  volverASeleccion(): void {
    this.vistaModal.set('seleccion');
    this.opcionSeleccionada.set(null);
  }

  enviarLogin(): void {
    const opcion = this.opcionSeleccionada();
    alert(`Demo: acceso enviado para ${opcion?.ruta}`);
    this.closePlatformModal();
  }
}
