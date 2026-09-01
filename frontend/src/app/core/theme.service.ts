import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const STORAGE_KEY = 'theme-preference';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  // true solo en el navegador; false durante SSR (request) Y durante
  // el prerenderizado en tiempo de build — en ambos casos no hay DOM real.
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // CLARO por defecto (requisito del informe del cliente: "mantener la
  // estética en Modo Claro... predominante"). El toggle sigue disponible
  // para quien prefiera oscuro, y esa preferencia se recuerda.
  isDark = signal(false);

  constructor() {
    if (!this.isBrowser) {
      return; // en servidor/prerender no tocamos localStorage ni document
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      this.isDark.set(saved === 'dark');
    }
    this.applyTheme();
  }

  toggle(): void {
    if (!this.isBrowser) return;

    this.isDark.set(!this.isDark());
    localStorage.setItem(STORAGE_KEY, this.isDark() ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme(): void {
    document.documentElement.classList.toggle('dark', this.isDark());
  }
}