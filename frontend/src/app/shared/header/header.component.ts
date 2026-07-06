import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { inject } from '@angular/core';
import { ThemeService } from '../../core/theme.service';

interface PlataformaOption {
  numero: string;
  tituloKey: string;
  descripcionKey: string;
  ruta: string;
}

const PLATAFORMA_OPTIONS: PlataformaOption[] = [
  { numero: '1', tituloKey: 'plataforma.portal_titulo', descripcionKey: 'plataforma.portal_desc', ruta: 'portal.[dominio-empresa].com' },
  { numero: '2', tituloKey: 'plataforma.tecnico_titulo', descripcionKey: 'plataforma.tecnico_desc', ruta: 'tecnico.[dominio-empresa].com' },
  { numero: '3', tituloKey: 'plataforma.admin_titulo', descripcionKey: 'plataforma.admin_desc', ruta: 'admin.[dominio-empresa].com' }
];

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  theme = inject(ThemeService);
  private translate = inject(TranslateService);

  menuMovilAbierto = signal(false);
  platformModalOpen = signal(false);
  platformOptions = PLATAFORMA_OPTIONS;

  cambiarIdioma(lang: string): void {
    this.translate.use(lang);
  }

  toggleMenuMovil(): void {
    this.menuMovilAbierto.set(!this.menuMovilAbierto());
  }

  cerrarMenuMovil(): void {
    this.menuMovilAbierto.set(false);
  }

  openPlatformModal(): void {
    this.platformModalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closePlatformModal(): void {
    this.platformModalOpen.set(false);
    document.body.style.overflow = 'auto';
  }

  seleccionarPlataforma(opcion: PlataformaOption): void {
    // DEMO: en producción esto navega al subdominio real (opcion.ruta).
    alert(`Demo: esto llevaría a ${opcion.ruta}`);
    this.closePlatformModal();
  }
}