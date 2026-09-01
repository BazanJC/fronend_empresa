import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

export interface IdiomaInfo {
  codigo: string;
  nombreNativo: string;
  rtl: boolean;
}

export const IDIOMAS_DISPONIBLES: IdiomaInfo[] = [
  { codigo: 'es', nombreNativo: 'Español', rtl: false },
  { codigo: 'en', nombreNativo: 'English', rtl: false },
  { codigo: 'fr', nombreNativo: 'Français', rtl: false },
  { codigo: 'ar', nombreNativo: 'العربية', rtl: true },
  { codigo: 'ru', nombreNativo: 'Русский', rtl: false }
];

const STORAGE_KEY = 'idioma-preferencia';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  idiomas = IDIOMAS_DISPONIBLES;
  idiomaActual = signal<IdiomaInfo>(IDIOMAS_DISPONIBLES[0]);

  inicializar(): void {
    let codigoInicial = 'es';

    if (this.isBrowser) {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (guardado && IDIOMAS_DISPONIBLES.some((i) => i.codigo === guardado)) {
        codigoInicial = guardado;
      }
    }

    this.aplicarIdioma(codigoInicial);
  }

  cambiarIdioma(codigo: string): void {
    this.aplicarIdioma(codigo);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, codigo);
    }
  }

  private aplicarIdioma(codigo: string): void {
    const idioma = IDIOMAS_DISPONIBLES.find((i) => i.codigo === codigo) ?? IDIOMAS_DISPONIBLES[0];
    this.idiomaActual.set(idioma);
    this.translate.use(idioma.codigo);

    if (this.isBrowser) {
      document.documentElement.setAttribute('dir', idioma.rtl ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', idioma.codigo);
    }
  }
}